'use client';
import {useEffect, useRef, useState} from 'react';
import {CLIP_EXERCISES, CONFIDENT, EXERCISE_LABEL, clipSignal, countReps, exerciseFor, type ClipExercise, type RepCount} from '@/lib/rally/repcount';
import {analyzeClip, CLIP_FPS, CLIP_MAX_S, type ClipFrames} from './clip';
import styles from './rally.module.css';

export type ClipPayload = {exercise: ClipExercise; fps: number; signal: (number | null)[]; frames: string[]};

/** "Record a clip": counts reps on the phone, previews the count, hands the signal + 3 stills to the sheet. */
export function ClipProof({exercises, target, onChange}: {exercises?: string[]; target?: number | null; onChange: (clip: ClipPayload | null) => void}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<ClipFrames | null>(null);
  const [exercise, setExercise] = useState<ClipExercise>(() => exerciseFor((exercises ?? []).join(' ')) ?? 'pushup');
  const [stage, setStage] = useState<'idle' | 'model' | 'frames' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState<RepCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => clipRef.current?.dispose(), []);

  const score = async (ex: ClipExercise) => {
    const clip = clipRef.current;
    if (!clip) return;
    const signal = clipSignal(clip.landmarks, ex).map(x => (x == null ? null : Math.round(x * 100) / 100));
    const c = countReps(signal, CLIP_FPS, ex);
    setCount(c);
    if (!c.reps) return onChange(null);
    // stills at rep bottoms (or spread across the clip): what Muse checks to confirm it's really this exercise
    const n = clip.landmarks.length;
    const pick = c.bottoms.length >= 3 ? [c.bottoms[0], c.bottoms[c.bottoms.length >> 1], c.bottoms[c.bottoms.length - 1]] : [n * 0.25, n * 0.5, n * 0.75].map(Math.floor);
    onChange({exercise: ex, fps: CLIP_FPS, signal, frames: await clip.stills(pick)});
  };

  const onFile = async (file: File) => {
    setError(null);
    setCount(null);
    onChange(null);
    clipRef.current?.dispose();
    clipRef.current = null;
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

  const clear = () => {
    clipRef.current?.dispose();
    clipRef.current = null;
    setStage('idle');
    setCount(null);
    setError(null);
    onChange(null);
  };

  const label = EXERCISE_LABEL[exercise];
  return (
    <div className={styles.clip}>
      <div className={styles.proofRow}>
        <select value={exercise} aria-label="Exercise in the clip" onChange={e => {
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
        {stage === 'done' ? (
          <button type="button" className="fb-btn-secondary" onClick={clear}>
            Remove clip
          </button>
        ) : (
          <button type="button" className="fb-btn-secondary" disabled={stage !== 'idle'} onClick={() => fileRef.current?.click()}>
            {stage === 'model' ? 'Loading rep counter…' : stage === 'frames' ? `Counting reps… ${Math.round(progress * 100)}%` : 'Record a clip (+25%, reps counted)'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="video/*" capture="environment" hidden onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onFile(f);
        }} />
      </div>
      {count && (
        <p className={count.reps && count.confidence >= CONFIDENT ? styles.clipOk : styles.clipWarn} role="status">
          {count.reps === 0
            ? `No full ${label} found. Film from the side with your whole body in frame.`
            : count.confidence >= CONFIDENT
              ? `Counted ${count.reps} ${label} · ${Math.round(count.confidence * 100)}% sure${target != null && count.reps >= target * 1.2 ? ' · critical hit!' : ''}`
              : `Counted ${count.reps} ${label}, but the count is shaky, so it gets photo credit (+10%). Film from the side, one person in frame.`}
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.sheetMeta}>Push-ups, squats, lunges, sit-ups or jumping jacks, up to {CLIP_MAX_S} s. Your video stays on your phone; only the rep count and 3 stills are sent.</p>
    </div>
  );
}
