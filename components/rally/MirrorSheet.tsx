'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {RallyAvatar} from './Avatar';
import {angleFrame, jointHits, MATCH_AT, mirrorTitle, pointFrame, poseScore, toReference, type AngleFrame, type Target} from '@/lib/rally/mirror';
import type {MirrorState} from '@/lib/rally/mirror-store';
import type {Landmark} from '@/lib/rally/repcount';
import {IconCamera} from '@tabler/icons-react';
import {analyzeVideoUrl, cameraAccess, cameraHelp, localVideo, openCamera, stillsFromUrl, trackLive, warmLive, type CameraAccess} from './clip';
import {burstOverlay, resetOverlay, setOverlay, startOverlay} from './overlay';
import styles from './rally.module.css';
import m from './mirror.module.css';

/** camera = the 'Turn on your camera' step shown before the first camera use (or after it was blocked). */
type Stage = 'intro' | 'camera' | 'guide' | 'scoring' | 'result';
type Result = {score: number; best: number; note: string; stepScores: number[]};
type Stills = {urls: string[]; aspect: number};

/** Pose samples per second read from the Reel (enough for 2-6 s steps). */
const REF_FPS = 4;
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
  const [cam, setCam] = useState<CameraAccess>('unknown');
  const [camError, setCamError] = useState<string | null>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTrack = useRef<(() => void) | null>(null);
  const stopOverlay = useRef<(() => void) | null>(null);
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
    stopOverlay.current?.();
    stopOverlay.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  useEffect(() => stopAll, []);

  const ready = Boolean(state?.steps && state?.targets);
  useEffect(() => {
    if (open) void cameraAccess().then(setCam);
  }, [open]);
  // on open, the Reel download starts alongside the match data (the pose model loads later, see below)
  useEffect(() => {
    if (open) void localVideo(videoUrl).catch(() => {});
  }, [open, videoUrl]);
  // poll only while the Reel is still being read
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
    if (!open || !targets) return;
    let alive = true;
    targetsRef.current = targets;
    // reruns if Spark renames the steps after the first load (new target times)
    stillsFromUrl(videoUrl, targets.map(t => clipStart + (t?.at ?? 0)))
      .then(s => {
        if (!alive) return;
        aspectRef.current = s.aspect;
        setStills(s);
        // the pose model is heavy to start (it stalls the page for a few seconds), so it loads only once the
        // pictures are up, while the player reads them, and Start opens the camera without the wait
        window.setTimeout(() => void warmLive().catch(() => {}), 300);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
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
    setOverlay({matched, holdSince: 0});
    if (matched) burstOverlay();
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
    setSeen(Boolean(pts));
    setLive(score);
    // while "Nice!" shows, keep the gold knight and only move the player
    if (r.busy) return setOverlay({user: pts});
    const now = performance.now();
    if (score >= MATCH_AT) r.holdSince ||= now;
    else r.holdSince = 0;
    setOverlay({target: t?.points ?? null, aspect: aspectRef.current, user: pts, hits: t ? jointHits(t.angles, angles) : null, matched: score >= MATCH_AT, holdSince: r.holdSince, holdMs: HOLD_MS});
    if (r.holdSince && now - r.holdSince >= HOLD_MS) return advance(true);
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
      // first thing after the tap: iPhones only show their camera prompt for a call made from a tap
      stream = await openCamera('user');
    } catch (e) {
      setCamError(e instanceof Error ? e.message : 'Could not open the camera.');
      setCam(await cameraAccess());
      setStage('camera');
      return;
    }
    setCam('granted');
    setCamError(null);
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
      if (canvasRef.current) stopOverlay.current = startOverlay(canvasRef.current, v);
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

  /** Start / Go again / Again: straight to the camera once it's allowed, else the explainer first. */
  const begin = () => {
    setError(null);
    if (cam === 'granted') void start();
    else setStage('camera');
  };
  const blocked = Boolean(camError) || cam === 'denied';

  const steps = state?.steps ?? [];
  const current = steps[step];
  const still = stills?.urls[step];
  const over = state?.status === 'done';

  const lead = state?.mode === 'dance' ? 'Hit each move on camera. Best score wins.' : 'Hold each pose on camera. Best score wins.';
  const retry = needsReference && refProgress == null ? <Button label="Retry" variant="secondary" size="sm" onClick={() => setRefTry(n => n + 1)} /> : undefined;

  const footer =
    stage === 'guide' ? (
      <>
        <Button label="Stop" variant="secondary" onClick={quit} />
        <Button label="Skip" variant="secondary" isDisabled={Boolean(flash)} onClick={() => !run.current.busy && advance(false)} />
      </>
    ) : stage === 'result' ? (
      <>
        <Button label="Again" variant="secondary" isDisabled={over} onClick={begin} />
        <Button label="Done" variant="primary" onClick={close} />
      </>
    ) : stage === 'intro' ? (
      <>
        <Button label="Close" variant="secondary" onClick={close} />
        <Button label={over ? 'Match over' : state?.mine ? 'Go again' : 'Start'} variant="primary" isDisabled={!ready || over} onClick={begin} />
      </>
    ) : stage === 'camera' ? (
      <>
        <Button label="Not now" variant="secondary" onClick={() => setStage('intro')} />
        <Button label={blocked ? 'Try again' : 'Allow camera'} variant="primary" onClick={() => void start()} />
      </>
    ) : null;

  return (
    <Dialog isOpen={open} onOpenChange={o => !o && close()} purpose="form" width={560}>
      <Layout
        header={<DialogHeader title={state ? mirrorTitle(state.mode) : 'Mirror'} subtitle={stage === 'intro' ? 'Video stays on your phone.' : undefined} onOpenChange={() => close()} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              {!state && <Spinner size="sm" />}

              {state && stage === 'intro' && (
                <>
                  <Text>{lead}</Text>
                  {ready ? (
                    <ol className={m.poses}>
                      {steps.map((s, i) => (
                        <li key={i}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {stills?.urls[i] ? <img src={stills.urls[i]} alt="" /> : <span className={m.posePh} />}
                          <Text type="supporting" weight="bold" maxLines={1}>
                            {s.name}
                          </Text>
                        </li>
                      ))}
                    </ol>
                  ) : state.unreadable ? (
                    <Banner status="warning" title="Nobody is clearly visible in this Reel" description="Start a new game from another Reel." />
                  ) : (
                    <HStack gap={2} vAlign="center">
                      <Spinner size="sm" />
                      <Text color="secondary">{refProgress != null ? `Reading the Reel… ${Math.round(refProgress * 100)}%` : 'Getting the poses ready…'}</Text>
                    </HStack>
                  )}
                  <Leaderboard state={state} />
                </>
              )}

              {stage === 'camera' && (
                <VStack gap={3}>
                  <HStack gap={3} vAlign="center">
                    <IconCamera size={36} aria-hidden />
                    <Heading level={3}>Turn on your camera</Heading>
                  </HStack>
                  <Text>Mirror checks each pose with your front camera. Video stays on your phone; nothing is recorded or sent.</Text>
                  {blocked ? (
                    <Banner status="warning" title={camError ?? 'Camera is off for this site'} description={camError ? undefined : cameraHelp()} />
                  ) : (
                    <Text type="supporting" color="secondary">
                      Your phone will ask next. Tap Allow.
                    </Text>
                  )}
                </VStack>
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
                  <Text color="secondary">{current.cue}</Text>
                  <ProgressBar label="Match" isLabelHidden value={live} max={100} />
                </>
              )}

              {stage === 'scoring' && (
                <HStack gap={2} vAlign="center">
                  <Spinner size="sm" />
                  <Text color="secondary">Grading…</Text>
                </HStack>
              )}

              {stage === 'result' && result && state && (
                <>
                  <VStack gap={1}>
                    <Heading level={2}>{result.score} / 100</Heading>
                    <Text>{result.note}</Text>
                    {result.best > result.score && (
                      <Text type="supporting" color="secondary">
                        Your best: {result.best}
                      </Text>
                    )}
                  </VStack>
                  <VStack gap={2}>
                    {steps.map((s, i) => (
                      <ProgressBar key={i} label={s.name} value={result.stepScores[i] ?? 0} max={100} hasValueLabel formatValueLabel={v => (v ? String(v) : '–')} />
                    ))}
                  </VStack>
                  <Leaderboard state={state} />
                </>
              )}

              {error && <Banner status="error" title={error} endContent={retry} />}
            </VStack>
          </LayoutContent>
        }
        footer={
          footer && (
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                {footer}
              </HStack>
            </LayoutFooter>
          )
        }
      />
    </Dialog>
  );
}

/** Scores with each player's Kingdom hero; the winner's hero celebrates. */
function Leaderboard({state}: {state: MirrorState}) {
  if (!state.scores.length) return null;
  return (
    <List hasDividers aria-label="Scores">
      {state.scores.map((s, i) => {
        const won = state.winnerId === s.userId;
        return (
          <ListItem
            key={s.userId}
            startContent={<RallyAvatar src={s.avatarUrl} name={s.name} state={won ? 'celebrate' : 'idle'} size={40} mvp={won} />}
            label={<Text weight="bold">{s.name.split(' ')[0]}</Text>}
            description={i === 0 ? 'Top score' : undefined}
            endContent={<Token label={String(s.score)} size="sm" color={won ? 'green' : 'blue'} />}
          />
        );
      })}
    </List>
  );
}
