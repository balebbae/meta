'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {angleFrame, MATCH_AT, pointFrame, poseScore, toReference, type AngleFrame, type Target} from '@/lib/rally/mirror';
import type {MirrorState} from '@/lib/rally/mirror-store';
import type {Landmark} from '@/lib/rally/repcount';
import {analyzeVideoUrl, openCamera, stillsFromUrl, trackLive} from './clip';
import {drawOverlay, resetOverlay} from './overlay';
import styles from './rally.module.css';
import m from './mirror.module.css';

type Stage = 'intro' | 'guide' | 'scoring' | 'result';
type Result = {score: number; best: number; note: string; stepScores: number[]};
type Stills = {urls: string[]; aspect: number};

const REF_FPS = 8;
/** Hold a matching pose this long to pass it. */
const HOLD_MS = 700;
/** Then move on anyway, keeping the closest pose. */
const STEP_MS = 20_000;
const FLASH_MS = 900;
const json = (body: unknown) => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
const errorOf = async (res: Response, fallback: string) => ((await res.json().catch(() => ({}))) as {error?: string}).error ?? fallback;

/**
 * Mirror Match, guided: the camera opens, the Reel's pose for each step is drawn over you, and once you match it
 * (and hold it) the next pose comes up. After the last pose the server grades the routine 1-100.
 * The Reel's poses are read once, on the first player's phone. Video never leaves the device.
 */
export function MirrorSheet({matchId, open, onClose}: {matchId: number; open: boolean; onClose: () => void}) {
  const [state, setState] = useState<MirrorState | null>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [step, setStep] = useState(0);
  const [live, setLive] = useState(0);
  const [seen, setSeen] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [stills, setStills] = useState<Stills | null>(null);
  const [refProgress, setRefProgress] = useState<number | null>(null);
  const [refTry, setRefTry] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTrack = useRef<(() => void) | null>(null);
  const timers = useRef<number[]>([]);
  const refStarted = useRef(false);
  const targetsRef = useRef<(Target | null)[]>([]);
  const aspectRef = useRef(9 / 16);
  const run = useRef({step: 0, best: [] as AngleFrame[], bestScore: [] as number[], holdSince: 0, stepStarted: 0, busy: false});
  const videoUrl = `/api/mirror/${matchId}/video`;

  const load = useCallback(async () => {
    // a dropped poll (server busy recompiling, offline) just waits for the next one
    try {
      const res = await fetch(`/api/mirror/${matchId}`);
      if (res.ok) setState(await res.json());
    } catch {}
  }, [matchId]);

  const stopAll = () => {
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
    stopTrack.current?.();
    stopTrack.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  useEffect(() => stopAll, []);

  const ready = Boolean(state?.steps && state?.targets);
  // poll only while Muse is still naming the poses or the Reel is still being read
  useEffect(() => {
    if (!open) return;
    void load();
    if (ready) return;
    const t = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(t);
  }, [open, load, ready]);

  // read the Reel's poses once (the first player to open the match does it for everyone)
  const needsReference = Boolean(state?.needsReference);
  const clipStart = state?.clipStart ?? 0;
  const clipEnd = state?.clipEnd ?? 0;
  useEffect(() => {
    if (!open || !needsReference || refStarted.current) return;
    refStarted.current = true;
    setRefProgress(0);
    setError(null);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 60_000));
    Promise.race([analyzeVideoUrl(videoUrl, clipStart, clipEnd, REF_FPS, setRefProgress), timeout])
      .then(frames => fetch(`/api/mirror/${matchId}/reference`, json(toReference(frames, REF_FPS))))
      .then(async res => {
        if (!res.ok) setError(await errorOf(res, 'Could not read this Reel.'));
        await load();
      })
      .catch(() => {
        refStarted.current = false;
        setError('Could not load the Reel.');
      })
      .finally(() => setRefProgress(null));
  }, [open, needsReference, clipStart, clipEnd, matchId, videoUrl, load, refTry]);

  // a still of the Reel at each target pose, shown in the corner while you match it
  const targets = state?.targets ?? null;
  const targetKey = targets?.map(t => t?.at ?? -1).join(',');
  useEffect(() => {
    if (!open || !targets || stills) return;
    targetsRef.current = targets;
    stillsFromUrl(videoUrl, targets.map(t => clipStart + (t?.at ?? 0)))
      .then(s => {
        aspectRef.current = s.aspect;
        setStills(s);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetKey, videoUrl, clipStart]);

  const submit = async (poses: AngleFrame[]) => {
    setStage('scoring');
    try {
      const res = await fetch(`/api/mirror/${matchId}/attempt`, json({poses}));
      if (!res.ok) throw new Error(await errorOf(res, 'Could not grade this run.'));
      setResult(await res.json());
      setStage('result');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not grade this run.');
      setStage('intro');
    }
  };

  const advance = (matched: boolean) => {
    const r = run.current;
    r.busy = true;
    setFlash(matched ? 'Nice!' : 'Next');
    timers.current.push(
      window.setTimeout(() => {
        const ts = targetsRef.current;
        let n = r.step + 1;
        while (n < ts.length && !ts[n]) n++;
        setFlash(null);
        if (n >= ts.length) {
          stopAll();
          // the camera never saw a body: don't post a score of 1 to the chat
          if (r.bestScore.every(x => x === 0)) {
            setStage('intro');
            setError("Couldn't see you. Step back and try again.");
            return;
          }
          void submit(r.best);
          return;
        }
        Object.assign(r, {step: n, holdSince: 0, stepStarted: performance.now(), busy: false});
        resetOverlay();
        setStep(n);
      }, FLASH_MS),
    );
  };

  const onPose = (lm: Landmark[] | null) => {
    const r = run.current;
    const t = targetsRef.current[r.step];
    const pts = pointFrame(lm);
    const angles = angleFrame(lm);
    const score = t && pts ? poseScore(t.angles, angles) : 0;
    if (score > r.bestScore[r.step]) {
      r.bestScore[r.step] = score;
      r.best[r.step] = angles;
    }
    if (canvasRef.current && camRef.current) drawOverlay(canvasRef.current, camRef.current, t?.points ?? null, aspectRef.current, pts, score >= MATCH_AT);
    setSeen(Boolean(pts));
    setLive(score);
    if (r.busy) return;
    const now = performance.now();
    if (score >= MATCH_AT) {
      r.holdSince ||= now;
      if (now - r.holdSince >= HOLD_MS) return advance(true);
    } else r.holdSince = 0;
    if (now - r.stepStarted > STEP_MS) advance(false);
  };

  const start = async () => {
    const ts = state?.targets;
    if (!ts) return;
    const first = ts.findIndex(Boolean);
    if (first < 0) return setError('No clear poses in this Reel.');
    setError(null);
    let stream: MediaStream;
    try {
      stream = await openCamera('user');
    } catch (e) {
      return setError(e instanceof Error ? e.message : 'Could not open the camera.');
    }
    streamRef.current = stream;
    targetsRef.current = ts;
    run.current = {step: first, best: ts.map(() => angleFrame(null)), bestScore: ts.map(() => 0), holdSince: 0, stepStarted: performance.now(), busy: false};
    resetOverlay();
    setStep(first);
    setLive(0);
    setStage('guide');
    requestAnimationFrame(async () => {
      const v = camRef.current;
      if (!v) return;
      v.srcObject = stream;
      await v.play().catch(() => {});
      try {
        stopTrack.current = await trackLive(v, onPose);
        run.current.stepStarted = performance.now();
      } catch {
        stopAll();
        setStage('intro');
        setError('Pose tracker failed to load.');
      }
    });
  };

  const quit = () => {
    stopAll();
    setFlash(null);
    setStage('intro');
  };

  const close = () => {
    quit();
    setResult(null);
    setError(null);
    onClose();
  };

  const steps = state?.steps ?? [];
  const current = steps[step];
  const still = stills?.urls[step];
  const over = state?.status === 'done';

  return (
    <Dialog open={open} onClose={close} title="Mirror Match" width={560}>
      <div className={m.body}>
        {!state && <p className={styles.sheetMeta}>Loading…</p>}

        {state && stage === 'intro' && (
          <>
            <p className={styles.sheetLead}>Match each pose on camera. Best score wins.</p>
            {ready ? (
              <ol className={m.poses}>
                {steps.map((s, i) => (
                  <li key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {stills?.urls[i] ? <img src={stills.urls[i]} alt="" /> : <span className={m.posePh} />}
                    <span>{s.name}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={m.status}>
                <span className={m.spinner} /> {refProgress != null ? `Reading the Reel… ${Math.round(refProgress * 100)}%` : 'Getting the poses ready…'}
              </p>
            )}
            <Leaderboard state={state} />
            <button type="button" className="fb-btn-primary" disabled={!ready || over} onClick={() => void start()}>
              {over ? 'Match over' : state.mine ? 'Go again' : 'Start'}
            </button>
          </>
        )}

        {stage === 'guide' && current && (
          <>
            <div className={styles.camera}>
              <video ref={camRef} className={styles.cameraMirror} muted playsInline autoPlay aria-label="Camera" />
              <canvas ref={canvasRef} className={m.overlay} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {still && <img className={m.pip} src={still} alt={`${current.name} in the Reel`} />}
              <div className={m.hud}>
                <span>
                  {step + 1}/{steps.length}
                </span>
                <strong>{current.name}</strong>
              </div>
              {flash && <div className={styles.cameraBig}>{flash}</div>}
              {!flash && !seen && <div className={m.hint}>Step back. Whole body in frame.</div>}
            </div>
            <p className={m.cue}>{current.cue}</p>
            <div className={m.meter} role="meter" aria-label="Match" aria-valuenow={live} aria-valuemin={0} aria-valuemax={100}>
              <span className={live >= MATCH_AT ? m.hit : undefined} style={{width: `${live}%`}} />
            </div>
            <div className={m.actions}>
              <button type="button" className="fb-btn-secondary" onClick={quit}>
                Stop
              </button>
              <button type="button" className="fb-btn-secondary" disabled={Boolean(flash)} onClick={() => !run.current.busy && advance(false)}>
                Skip
              </button>
            </div>
          </>
        )}

        {stage === 'scoring' && (
          <p className={m.status}>
            <span className={m.spinner} /> Grading…
          </p>
        )}

        {stage === 'result' && result && state && (
          <div className={m.result}>
            <div className={m.score}>
              {result.score}
              <small>/100</small>
            </div>
            {result.best > result.score && <p className={styles.sheetMeta}>Best: {result.best}</p>}
            <p className={styles.sheetNarration}>{result.note}</p>
            <ul className={m.stepScores}>
              {steps.map((s, i) => (
                <li key={i}>
                  <span>{s.name}</span>
                  <span className={m.bar}>
                    <span style={{width: `${result.stepScores[i] ?? 0}%`}} />
                  </span>
                  <span>{result.stepScores[i] || '–'}</span>
                </li>
              ))}
            </ul>
            <Leaderboard state={state} />
            <div className={m.actions}>
              <button type="button" className="fb-btn-secondary" onClick={() => void start()} disabled={over}>
                Again
              </button>
              <button type="button" className="fb-btn-primary" onClick={close}>
                Done
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className={styles.error}>
            {error}{' '}
            {needsReference && refProgress == null && (
              <button type="button" className={styles.linkBtn} onClick={() => setRefTry(n => n + 1)}>
                Retry
              </button>
            )}
          </p>
        )}
        {stage === 'intro' && <p className={styles.sheetMeta}>Video stays on your phone.</p>}
      </div>
    </Dialog>
  );
}

function Leaderboard({state}: {state: MirrorState}) {
  if (!state.scores.length) return null;
  return (
    <ol className={m.board} aria-label="Scores">
      {state.scores.map((s, i) => (
        <li key={s.userId} className={state.winnerId === s.userId ? m.winner : undefined}>
          <span>{i + 1}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.avatarUrl} alt="" />
          <span className={m.name}>{s.name.split(' ')[0]}</span>
          <strong>{s.score}</strong>
        </li>
      ))}
    </ol>
  );
}
