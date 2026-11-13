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
const blobs = new Map<string, Promise<string>>();

/**
 * Downloads a same-origin video once per page and hands out a blob: URL, so reading poses and grabbing stills
 * seek in memory instead of making a Range request per frame (and the Reel isn't downloaded twice).
 */
export function localVideo(url: string): Promise<string> {
  let p = blobs.get(url);
  if (!p) {
    p = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('This Reel can’t be loaded right now.');
        return r.blob();
      })
      .then(b => URL.createObjectURL(b));
    blobs.set(url, p);
    p.catch(() => blobs.delete(url));
  }
  return p;
}

export async function analyzeVideoUrl(url: string, start: number, end: number, fps: number, onProgress: (p: number) => void): Promise<(Landmark[] | null)[]> {
  const canPlayScan = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  // Playing streams, so it starts on the first bytes; seeking needs the whole file in memory. Either way the
  // in-memory copy (for the pose pictures) downloads alongside, and the pose model loads in parallel.
  const local = localVideo(url);
  const [det, src] = await Promise.all([getDetector(), canPlayScan ? url : local]);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = src;
  await once(v, 'loadeddata');
  const stop = Math.min(end, Number.isFinite(v.duration) ? v.duration : end);
  const n = Math.max(1, Math.floor((stop - start) * fps));
  let out = canPlayScan ? await scanByPlaying(v, det, start, stop, fps, onProgress) : null;
  if (!out) {
    v.src = await local;
    await once(v, 'loadeddata');
    out = await scanBySeeking(v, det, start, n, fps, onProgress);
  }
  onProgress(1);
  v.removeAttribute('src');
  v.load();
  return out;
}

const SCAN_RATE = 1.5;

/**
 * Plays the clip at 1.5x and runs the pose model on frames as they arrive (at most `fps` a second), then lines
 * the samples up on the fps grid. Seeking costs a keyframe decode per frame, so this is ~3x faster than seeking.
 * Returns null if the browser wouldn't play it (the caller then seeks frame by frame).
 */
async function scanByPlaying(v: HTMLVideoElement, det: Detector, start: number, stop: number, fps: number, onProgress: (p: number) => void): Promise<(Landmark[] | null)[] | null> {
  const samples: {t: number; lm: Landmark[] | null}[] = [];
  if (start > 0) await seek(v, start);
  v.playbackRate = SCAN_RATE;
  await new Promise<void>(resolve => {
    let done = false;
    let last = -Infinity;
    const finish = () => {
      if (done) return;
      done = true;
      v.pause();
      resolve();
    };
    const tick = (_now: number, meta: {mediaTime: number}) => {
      if (done) return;
      const t = meta.mediaTime;
      // the last frame can sit just short of the end, so stop one sample early instead of waiting for 'ended'
      if (t >= stop - 1 / fps) return finish();
      if (t - last >= 1 / fps - 0.02) {
        samples.push({t, lm: pose(det, v)});
        last = t;
        onProgress(Math.min(0.99, (t - start) / Math.max(0.1, stop - start)));
      }
      v.requestVideoFrameCallback(tick);
    };
    v.requestVideoFrameCallback(tick);
    v.addEventListener('ended', finish, {once: true});
    v.play().catch(finish);
    // safety net: a stalled decoder never ends the scan
    setTimeout(finish, ((stop - start) / SCAN_RATE) * 1000 + 4_000);
  });
  if (samples.length < 2) return null;
  // nearest sample to each grid slot (within half a second), so the Reference stays a plain fps grid
  const n = Math.max(1, Math.floor((stop - start) * fps));
  return Array.from({length: n}, (_, i) => {
    const t = start + i / fps;
    let best: (typeof samples)[number] | null = null;
    for (const s of samples) if (!best || Math.abs(s.t - t) < Math.abs(best.t - t)) best = s;
    return best && Math.abs(best.t - t) <= 0.5 ? best.lm : null;
  });
}

async function scanBySeeking(v: HTMLVideoElement, det: Detector, start: number, n: number, fps: number, onProgress: (p: number) => void): Promise<(Landmark[] | null)[]> {
  // iOS Safari only decodes frames for seeking after a play()
  await v.play().catch(() => {});
  v.pause();
  const out: (Landmark[] | null)[] = [];
  for (let i = 0; i < n; i++) {
    await seek(v, start + i / fps);
    out.push(pose(det, v));
    if (i % 4 === 0) onProgress(i / n);
  }
  return out;
}

/** Mirror Match: stills of a same-origin video at the given seconds, plus its width/height ratio. */
export async function stillsFromUrl(url: string, times: number[]): Promise<{urls: string[]; aspect: number}> {
  const src = await localVideo(url);
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = src;
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
