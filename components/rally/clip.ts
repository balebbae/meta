/**
 * Browser-only clip analysis: MediaPipe Pose on the recorded video, on the phone. The video never leaves the device;
 * only the per-frame joint signal and a few stills are sent (lib/rally/repcount.ts recounts on the server).
 */
import type {Landmark} from '@/lib/rally/repcount';

const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const CLIP_FPS = 12;
export const CLIP_MAX_S = 90;

type PoseResult = {landmarks: {x: number; y: number; visibility?: number}[][]};
type Detector = {detectForVideo(frame: HTMLVideoElement, timestampMs: number): PoseResult};

// Loaded from the CDN at runtime (not bundled, no npm dependency): nothing is downloaded until someone records a clip.
const importUrl = new Function('u', 'return import(u)') as (u: string) => Promise<{
  FilesetResolver: {forVisionTasks(base: string): Promise<unknown>};
  PoseLandmarker: {createFromOptions(files: unknown, opts: unknown): Promise<Detector>};
}>;

let detector: Promise<Detector> | null = null;
// MediaPipe VIDEO mode needs strictly increasing timestamps across every clip analysed in this tab
let lastTs = 0;

function getDetector(): Promise<Detector> {
  detector ??= (async () => {
    const mp = await importUrl(`${VISION}/vision_bundle.mjs`);
    const files = await mp.FilesetResolver.forVisionTasks(`${VISION}/wasm`);
    const make = (delegate: 'GPU' | 'CPU') => mp.PoseLandmarker.createFromOptions(files, {baseOptions: {modelAssetPath: MODEL, delegate}, runningMode: 'VIDEO', numPoses: 1});
    try {
      return await make('GPU');
    } catch {
      return await make('CPU');
    }
  })();
  detector.catch(() => (detector = null));
  return detector;
}

const once = (el: HTMLVideoElement, ev: string) =>
  new Promise<void>((resolve, reject) => {
    const ok = () => (el.removeEventListener('error', bad), resolve());
    const bad = () => (el.removeEventListener(ev, ok), reject(new Error('This video could not be read on this device')));
    el.addEventListener(ev, ok, {once: true});
    el.addEventListener('error', bad, {once: true});
  });
const seek = (v: HTMLVideoElement, t: number) => {
  const p = once(v, 'seeked');
  v.currentTime = t;
  return p;
};

export type ClipFrames = {landmarks: (Landmark[] | null)[]; fps: number; stills(frameIdx: number[]): Promise<string[]>; dispose(): void};

/** A small JPEG of the current frame (what Ember checks), max 480 px on the long side. */
function grab(v: HTMLVideoElement): string {
  const c = document.createElement('canvas');
  const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

const pose = (det: Detector, v: HTMLVideoElement): Landmark[] | null => {
  lastTs = Math.max(lastTs + 1, Math.round(performance.now()));
  const p = det.detectForVideo(v, lastTs).landmarks[0];
  return p ? p.map(q => ({x: q.x, y: q.y, visibility: q.visibility})) : null;
};

/** Front or back camera, no audio. Throws a readable message when it's blocked or missing. */
export async function openCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera here. Upload a video instead.');
  try {
    return await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: facing}, width: {ideal: 640}, height: {ideal: 480}}});
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    throw new Error(name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site and try again.' : name === 'NotFoundError' ? 'No camera found on this device.' : 'Could not open the camera.');
  }
}

/** Preloads the pose model so recording starts instantly (call when the camera opens). */
export const warmUp = () => getDetector().then(() => undefined);

/**
 * Live recording: pose on the camera feed at ~CLIP_FPS, a still every second, nothing stored as video.
 * onFrame gets the landmarks so far (for the live rep counter). Stops itself at CLIP_MAX_S.
 */
export async function recordLive(v: HTMLVideoElement, onFrame: (landmarks: (Landmark[] | null)[], seconds: number) => void, onAutoStop: () => void) {
  const det = await getDetector();
  const landmarks: (Landmark[] | null)[] = [];
  const snaps: {i: number; url: string}[] = [];
  const started = performance.now();
  let lastSnap = -Infinity;
  const timer = window.setInterval(() => {
    if (v.readyState < 2) return;
    const now = performance.now();
    landmarks.push(pose(det, v));
    if (now - lastSnap >= 1000) {
      snaps.push({i: landmarks.length - 1, url: grab(v)});
      lastSnap = now;
    }
    const seconds = (now - started) / 1000;
    onFrame(landmarks, seconds);
    if (seconds >= CLIP_MAX_S) onAutoStop();
  }, 1000 / CLIP_FPS);
  return {
    stop(): ClipFrames {
      window.clearInterval(timer);
      const seconds = Math.max(0.1, (performance.now() - started) / 1000);
      // slow devices run pose below CLIP_FPS; the real rate keeps rep timing (min rep length, smoothing) honest
      const fps = Math.min(30, Math.max(5, landmarks.length / seconds));
      return {
        landmarks,
        fps,
        stills: async idx => idx.slice(0, 3).flatMap(i => (snaps.length ? [snaps.reduce((a, b) => (Math.abs(b.i - i) < Math.abs(a.i - i) ? b : a)).url] : [])),
        dispose: () => {},
      };
    },
  };
}

/**
 * Mirror Match: a same-origin video URL (the Reel via /api/mirror/[id]/video) -> one pose per frame between
 * start and end seconds at `fps`. Runs once per match, on the first player's phone.
 */
export async function analyzeVideoUrl(url: string, start: number, end: number, fps: number, onProgress: (p: number) => void): Promise<(Landmark[] | null)[]> {
  const det = await getDetector();
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  await once(v, 'loadeddata');
  // iOS Safari only decodes frames for seeking after a play()
  await v.play().catch(() => {});
  v.pause();
  const stop = Math.min(end, Number.isFinite(v.duration) ? v.duration : end);
  const out: (Landmark[] | null)[] = [];
  const n = Math.max(1, Math.floor((stop - start) * fps));
  for (let i = 0; i < n; i++) {
    await seek(v, start + i / fps);
    out.push(pose(det, v));
    if (i % 4 === 0) onProgress(i / n);
  }
  onProgress(1);
  v.removeAttribute('src');
  v.load();
  return out;
}

/** Mirror Match: stills of a same-origin video at the given seconds, plus its width/height ratio. */
export async function stillsFromUrl(url: string, times: number[]): Promise<{urls: string[]; aspect: number}> {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  await once(v, 'loadeddata');
  await v.play().catch(() => {});
  v.pause();
  const urls: string[] = [];
  for (const t of times) {
    await seek(v, Math.min(t, Math.max(0, v.duration - 0.05)));
    urls.push(grab(v));
  }
  const aspect = v.videoWidth / Math.max(1, v.videoHeight);
  v.removeAttribute('src');
  v.load();
  return {urls, aspect};
}

/** Live pose on the camera feed at ~CLIP_FPS, nothing stored. Returns stop(). */
export async function trackLive(v: HTMLVideoElement, onPose: (lm: Landmark[] | null) => void): Promise<() => void> {
  const det = await getDetector();
  const timer = window.setInterval(() => {
    if (v.readyState >= 2) onPose(pose(det, v));
  }, 1000 / CLIP_FPS);
  return () => window.clearInterval(timer);
}

/** Video file -> one pose per frame at CLIP_FPS (null = nobody found). onProgress gets 0..1. */
export async function analyzeClip(file: File, onProgress: (p: number, stage: 'model' | 'frames') => void): Promise<ClipFrames> {
  onProgress(0, 'model');
  const det = await getDetector();
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  try {
    await once(v, 'loadeddata');
    // iOS Safari only decodes frames for seeking after a play()
    await v.play().catch(() => {});
    v.pause();
    if (!Number.isFinite(v.duration) || v.duration <= 0) throw new Error('Could not read how long this video is');
    const duration = Math.min(v.duration, CLIP_MAX_S);
    const landmarks: (Landmark[] | null)[] = [];
    const n = Math.max(1, Math.floor(duration * CLIP_FPS));
    for (let i = 0; i < n; i++) {
      await seek(v, i / CLIP_FPS);
      landmarks.push(pose(det, v));
      if (i % 6 === 0) onProgress(i / n, 'frames');
    }
    onProgress(1, 'frames');
    return {
      landmarks,
      fps: CLIP_FPS,
      async stills(frameIdx) {
        const out: string[] = [];
        for (const i of frameIdx.slice(0, 3)) {
          await seek(v, Math.min(duration, i / CLIP_FPS));
          out.push(grab(v));
        }
        return out;
      },
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
