'use client';
import {useEffect, useRef, useState} from 'react';
import {CLIP_EXERCISES, CONFIDENT, EXERCISE_LABEL, clipSignal, countReps, exerciseFor, type ClipExercise, type Landmark, type RepCount} from '@/lib/rally/repcount';
import {analyzeClip, CLIP_MAX_S, openCamera, recordLive, warmUp, type ClipFrames} from './clip';
import styles from './rally.module.css';

export type ClipPayload = {exercise: ClipExercise; fps: number; signal: (number | null)[]; frames: string[]};
type Stage = 'idle' | 'camera' | 'countdown' | 'recording' | 'model' | 'frames' | 'done';

const COUNTDOWN_S = 3;

/**
 * "Record a clip": a live camera view in the sheet (front camera on laptops, either on phones), a countdown, a live
 * rep counter, Stop. Pose runs on the device; only the joint signal + 3 stills go to the server. Upload is the fallback.
 */
export function ClipProof({exercises, target, onChange}: {exercises?: string[]; target?: number | null; onChange: (clip: ClipPayload | null) => void}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const clipRef = useRef<ClipFrames | null>(null);
  const recRef = useRef<{stop(): ClipFrames} | null>(null);
  const countdownRef = useRef<number | null>(null);
  const [exercise, setExercise] = useState<ClipExercise>(() => exerciseFor((exercises ?? []).join(' ')) ?? 'pushup');
  const [stage, setStage] = useState<Stage>('idle');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const [live, setLive] = useState({reps: 0, seconds: 0, nobody: false});
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState<RepCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  // leaving the sheet mid-recording must release the camera
  useEffect(
    () => () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      recRef.current?.stop();
      stopCamera();
      clipRef.current?.dispose();
    },
    [],
  );

  const score = async (ex: ClipExercise) => {
    const clip = clipRef.current;
    if (!clip) return;
    const signal = clipSignal(clip.landmarks, ex).map(x => (x == null ? null : Math.round(x * 100) / 100));
    const c = countReps(signal, clip.fps, ex);
    setCount(c);
    if (!c.reps) return onChange(null);
    // stills at rep bottoms (or spread across the clip): what Muse checks to confirm it's really this exercise
    const n = clip.landmarks.length;
    const pick = c.bottoms.length >= 3 ? [c.bottoms[0], c.bottoms[c.bottoms.length >> 1], c.bottoms[c.bottoms.length - 1]] : [n * 0.25, n * 0.5, n * 0.75].map(Math.floor);
    onChange({exercise: ex, fps: clip.fps, signal, frames: await clip.stills(pick)});
  };

  const reset = () => {
    setError(null);
    setCount(null);
    onChange(null);
    clipRef.current?.dispose();
    clipRef.current = null;
  };

  const openLive = async (face = facing) => {
    reset();
    stopCamera();
    try {
      const stream = await openCamera(face);
      streamRef.current = stream;
      setStage('camera');
      // the <video> mounts with the 'camera' stage; attach on the next frame
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      });
      void warmUp().catch(() => setError('Could not load the rep counter. Check your connection and try again.'));
    } catch (e) {
      setStage('idle');
      setError(e instanceof Error ? e.message : 'Could not open the camera.');
    }
  };

  const start = () => {
    setStage('countdown');
    setCountdown(COUNTDOWN_S);
    let left = COUNTDOWN_S;
    countdownRef.current = window.setInterval(async () => {
      left -= 1;
      setCountdown(left);
      if (left > 0) return;
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      countdownRef.current = null;
      const v = videoRef.current;
      if (!v) return;
      setLive({reps: 0, seconds: 0, nobody: false});
      setStage('recording');
      try {
        let tick = 0;
        recRef.current = await recordLive(
          v,
          (lm: (Landmark[] | null)[], seconds) => {
            // live count every ~0.33 s; the final count (and the server's) runs on the whole clip
            if (++tick % 4) return;
            const fps = Math.max(5, lm.length / Math.max(seconds, 0.1));
            const recent = lm.slice(-12);
            setLive({reps: countReps(clipSignal(lm, exercise), fps, exercise).reps, seconds, nobody: recent.length === 12 && recent.every(f => f === null)});
          },
          () => void stop(),
        );
      } catch {
        setStage('camera');
        setError('Could not start the rep counter on this device. Try uploading a video instead.');
      }
    }, 1000);
  };

  const stop = async () => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    clipRef.current = rec.stop();
    stopCamera();
    setStage('done');
    await score(exercise);
  };

  const cancel = () => {
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    countdownRef.current = null;
    recRef.current?.stop();
    recRef.current = null;
    stopCamera();
    reset();
    setStage('idle');
  };

  const onFile = async (file: File) => {
    reset();
    try {
      clipRef.current = await analyzeClip(file, (p, s) => {
        setStage(s);
        setProgress(p);
      });
      setStage('done');
      await score(exercise);
    } catch (e) {
      setStage('idle');
      setError(e instanceof Error ? e.message : 'Could not count reps in that clip');
    }
  };

  const label = EXERCISE_LABEL[exercise];
  const cameraOpen = stage === 'camera' || stage === 'countdown' || stage === 'recording';
  return (
    <div className={styles.clip}>
      <div className={styles.proofRow}>
        <select value={exercise} aria-label="Exercise in the clip" disabled={stage === 'recording' || stage === 'countdown'} onChange={e => {
          const ex = e.target.value as ClipExercise;
          setExercise(ex);
          void score(ex);
        }}>
          {(Object.keys(CLIP_EXERCISES) as ClipExercise[]).map(k => (
            <option key={k} value={k}>
              {EXERCISE_LABEL[k]}
            </option>
          ))}
        </select>
        {stage === 'idle' && (
          <button type="button" className="fb-btn-secondary" onClick={() => void openLive()}>
            Record a clip (+25%, reps counted)
          </button>
        )}
        {(stage === 'model' || stage === 'frames') && (
          <button type="button" className="fb-btn-secondary" disabled>
            {stage === 'model' ? 'Loading rep counter…' : `Counting reps… ${Math.round(progress * 100)}%`}
          </button>
        )}
        {stage === 'done' && (
          <>
            <button type="button" className="fb-btn-secondary" onClick={() => void openLive()}>
              Record again
            </button>
            <button type="button" className="fb-btn-secondary" onClick={cancel}>
              Remove clip
            </button>
          </>
        )}
      </div>

      {cameraOpen && (
        <div className={styles.camera}>
          <video ref={videoRef} className={facing === 'user' ? styles.cameraMirror : styles.cameraVideo} muted playsInline autoPlay aria-label="Camera preview" />
          {stage === 'countdown' && <div className={styles.cameraBig}>{countdown}</div>}
          {stage === 'recording' && (
            <div className={styles.cameraHud} role="status" aria-live="polite">
              <span className={styles.cameraRec}>● {Math.floor(live.seconds)}s</span>
              <span className={styles.cameraReps}>
                {live.reps} {label}
              </span>
              {live.nobody && <span>Step back so your whole body is in frame</span>}
            </div>
          )}
          {stage === 'camera' && <div className={styles.cameraHint}>Prop the camera up and step back so your whole body is in frame, side-on.</div>}
          <div className={styles.cameraBar}>
            {stage === 'camera' && (
              <>
                <button type="button" className="fb-btn-primary" onClick={start}>
                  Start ({COUNTDOWN_S}s countdown)
                </button>
                <button type="button" className="fb-btn-secondary" onClick={() => {
                  const next = facing === 'user' ? 'environment' : 'user';
                  setFacing(next);
                  void openLive(next);
                }}>
                  Flip camera
                </button>
              </>
            )}
            {stage === 'recording' && (
              <button type="button" className="fb-btn-primary" onClick={() => void stop()}>
                Stop
              </button>
            )}
            <button type="button" className="fb-btn-secondary" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {count && stage === 'done' && (
        <p className={count.reps && count.confidence >= CONFIDENT ? styles.clipOk : styles.clipWarn} role="status">
          {count.reps === 0
            ? `No full ${label} found. Film from the side with your whole body in frame.`
            : count.confidence >= CONFIDENT
              ? `Counted ${count.reps} ${label} · ${Math.round(count.confidence * 100)}% sure${target != null && count.reps >= target * 1.2 ? ' · critical hit!' : ''}`
              : `Counted ${count.reps} ${label}, but the count is shaky, so it gets photo credit (+10%). Keep a steady pace, side-on, one person in frame.`}
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {(stage === 'idle' || stage === 'done') && (
        <p className={styles.sheetMeta}>
          Push-ups, squats, lunges, sit-ups or jumping jacks, up to {CLIP_MAX_S} s. Nothing is saved as video: reps are counted on your device and only the count and 3 stills are sent.{' '}
          <button type="button" className={styles.linkBtn} onClick={() => fileRef.current?.click()}>
            Upload a video instead
          </button>
        </p>
      )}
      <input ref={fileRef} type="file" accept="video/*" hidden onChange={e => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) void onFile(f);
      }} />
    </div>
  );
}
