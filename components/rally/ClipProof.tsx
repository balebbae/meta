'use client';
import {useEffect, useRef, useState} from 'react';
import {CLIP_EXERCISES, CONFIDENT, EXERCISE_LABEL, clipSignal, countReps, exerciseFor, type ClipExercise, type Landmark, type RepCount} from '@/lib/rally/repcount';
import {classifyPose} from '@/lib/rally/pose-classify';
import type {ClipInput} from '@/lib/rally/queries';
import {analyzeClip,CLIP_MAX_S, openCamera, recordLive, warmUp, type ClipFrames} from './clip';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Center} from '@astryxdesign/core/Center';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import styles from './rally.module.css';

export type ClipPayload = ClipInput;
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
    // which exercise the clip shows, classified on the device; only this small verdict is sent
    const v = classifyPose(clip.landmarks, clip.fps);
    const pose = {exercise: v.exercise, confidence: v.confidence, abstain: v.abstain, person_found: v.person_found, reps: c.reps};
    onChange({exercise: ex, fps: clip.fps, signal, frames: await clip.stills(pick), pose});
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
    <VStack gap={2}>
      <HStack gap={2} vAlign="end" wrap="wrap">
        <Selector
          label="Exercise in the clip"
          size="sm"
          options={(Object.keys(CLIP_EXERCISES) as ClipExercise[]).map(k => ({value: k, label: EXERCISE_LABEL[k]}))}
          value={exercise}
          isDisabled={stage === 'recording' || stage === 'countdown'}
          onChange={v => {
            const ex = v as ClipExercise;
            setExercise(ex);
            void score(ex);
          }}
        />
        {stage === 'idle' && <Button label="Record a clip (+25%, reps counted)" size="sm" onClick={() => void openLive()} />}
        {(stage === 'model' || stage === 'frames') && <Button label={stage === 'model' ? 'Loading rep counter…' : `Counting reps… ${Math.round(progress * 100)}%`} size="sm" isLoading />}
        {stage === 'done' && (
          <>
            <Button label="Record again" size="sm" onClick={() => void openLive()} />
            <Button label="Remove clip" size="sm" variant="ghost" onClick={cancel} />
          </>
        )}
      </HStack>

      {cameraOpen && (
        <VStack className={styles.camera}>
          <video ref={videoRef} className={facing === 'user' ? styles.cameraMirror : styles.cameraVideo} muted playsInline autoPlay aria-label="Camera preview" />
          {stage === 'countdown' && (
            <Center className={styles.cameraBig}>
              <Heading level={1} color="inherit">
                {countdown}
              </Heading>
            </Center>
          )}
          {stage === 'recording' && (
            <HStack gap={2} wrap="wrap" className={styles.cameraHud} role="status" aria-live="polite">
              <Token label={`● ${Math.floor(live.seconds)}s`} size="sm" color="red" />
              <Token label={`${live.reps} ${label}`} size="sm" />
              {live.nobody && <Text color="inherit">Step back so your whole body is in frame</Text>}
            </HStack>
          )}
          {stage === 'camera' && (
            <Text color="inherit" className={styles.cameraHint}>
              Prop the camera up and step back so your whole body is in frame, side-on.
            </Text>
          )}
          <HStack gap={2} hAlign="center" wrap="wrap" className={styles.cameraBar}>
            {stage === 'camera' && (
              <>
                <Button label={`Start (${COUNTDOWN_S}s countdown)`} variant="primary" onClick={start} />
                <Button
                  label="Flip camera"
                  onClick={() => {
                    const next = facing === 'user' ? 'environment' : 'user';
                    setFacing(next);
                    void openLive(next);
                  }}
                />
              </>
            )}
            {stage === 'recording' && <Button label="Stop" variant="primary" onClick={() => void stop()} />}
            <Button label="Cancel" onClick={cancel} />
          </HStack>
        </VStack>
      )}

      {count && stage === 'done' && (
        <Banner
          status={count.reps && count.confidence >= CONFIDENT ? 'success' : 'warning'}
          title={
            count.reps === 0
              ? `No full ${label} found. Film from the side with your whole body in frame.`
              : count.confidence >= CONFIDENT
                ? `Counted ${count.reps} ${label} · ${Math.round(count.confidence * 100)}% sure${target != null && count.reps >= target * 1.2 ? ' · critical hit!' : ''}`
                : `Counted ${count.reps} ${label}, but the count is shaky, so it gets photo credit (+10%). Keep a steady pace, side-on, one person in frame.`
          }
        />
      )}
      {error && <Banner status="error" title={error} />}
      {(stage === 'idle' || stage === 'done') && (
        <VStack gap={1} hAlign="start">
          <Text type="supporting" color="secondary">
            Push-ups, squats, lunges, sit-ups or jumping jacks, up to {CLIP_MAX_S} s. Nothing is saved as video: reps are counted on your device and only the count and 3 stills are sent.
          </Text>
          <Button label="Upload a video instead" size="sm" variant="ghost" onClick={() => fileRef.current?.click()} />
        </VStack>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onFile(f);
        }}
      />
    </VStack>
  );
}
