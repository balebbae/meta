/**
 * Browser-only clip analysis: MediaPipe Pose on the recorded video, on the phone. The video never leaves the device;
 * only the per-frame joint signal and a few stills are sent (lib/rally/repcount.ts recounts on the server).
 */
import type {Landmark} from '@/lib/rally/repcount';
import type {PoseLandmark} from '@/lib/rally/mirror';

const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const CLIP_FPS = 12;
export const CLIP_MAX_S = 90;

type PoseResult = {landmarks: {x: number; y: number; visibility?: number}[][]; worldLandmarks?: {x: number; y: number; z: number}[][]};
type Detector = {detectForVideo(frame: HTMLVideoElement, timestampMs: number): PoseResult};

// Loaded from the CDN at runtime (not bundled, no npm dependency): nothing is downloaded until someone records a clip.
const importUrl = new Function('u', 'return import(u)') as (u: string) => Promise<{
  FilesetResolver: {forVisionTasks(base: string): Promise<unknown>};
  PoseLandmarker: {createFromOptions(files: unknown, opts: unknown): Promise<Detector>};
}>;

let detector: Promise<Detector> | null = null;
// MediaPipe VIDEO mode needs strictly increasing timestamps across every clip analysed in this tab
let lastTs = 0;

/** The live-camera model: lite, fast enough for every frame. */
function getDetector(): Promise<Detector> {
  detector ??= makeDetector(MODEL, {});
  detector.catch(() => (detector = null));
  return detector;
}

/**
 * Reading a Reel happens once per match, so it gets the bigger "full" model and lower confidence floors: it finds
 * people the lite model misses (small in frame, lying down, dim light, fast dance moves).
 */
const READ_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
let reader: Promise<Detector> | null = null;
function getReader(): Promise<Detector> {
  reader ??= makeDetector(READ_MODEL, {minPoseDetectionConfidence: 0.3, minPosePresenceConfidence: 0.3, minTrackingConfidence: 0.3}).catch(() => getDetector());
  reader.catch(() => (reader = null));
  return reader;
}

/**
 * Mirror's live camera: lite (fast) but with the same lower confidence floors as the Reel reader, so a player the
 * Reel would count isn't dropped by the camera (dim rooms, standing further back). Separate from getDetector so
 * Rally's rep counter keeps its defaults.
 */
const LIVE_OPTS = {minPoseDetectionConfidence: 0.3, minPosePresenceConfidence: 0.3, minTrackingConfidence: 0.3};
let live: Promise<Detector> | null = null;
function getLive(): Promise<Detector> {
  live ??= makeDetector(MODEL, LIVE_OPTS);
  live.catch(() => (live = null));
  return live;
}

async function makeDetector(model: string, extra: Record<string, number>, only?: 'CPU'): Promise<Detector> {
  const mp = await importUrl(`${VISION}/vision_bundle.mjs`);
  const files = await mp.FilesetResolver.forVisionTasks(`${VISION}/wasm`);
  const make = (delegate: 'GPU' | 'CPU') => mp.PoseLandmarker.createFromOptions(files, {baseOptions: {modelAssetPath: model, delegate}, runningMode: 'VIDEO', numPoses: 1, ...extra});
  if (only) return make(only);
  try {
    return await make('GPU');
  } catch {
    return await make('CPU');
  }
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

/** Screen landmarks (for drawing) plus 3D world landmarks (for viewpoint-free joint angles). */
const pose = (det: Detector, v: HTMLVideoElement): PoseLandmark[] | null => {
  lastTs = Math.max(lastTs + 1, Math.round(performance.now()));
  const r = det.detectForVideo(v, lastTs);
  const p = r.landmarks[0];
  const w = r.worldLandmarks?.[0];
  return p ? p.map((q, i) => (w?.[i] ? {x: q.x, y: q.y, visibility: q.visibility, wx: w[i].x, wy: w[i].y, wz: w[i].z} : {x: q.x, y: q.y, visibility: q.visibility})) : null;
};

export type CameraAccess = 'granted' | 'denied' | 'prompt' | 'unknown';

/** Whether the site may already use the camera, without asking. Safari 16+, Chrome, Firefox; 'unknown' elsewhere. */
export async function cameraAccess(): Promise<CameraAccess> {
  try {
    const s = await navigator.permissions.query({name: 'camera' as PermissionName});
    return s.state;
  } catch {
    return 'unknown';
  }
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const inApp = () => Boolean((window as {__META_SHELL__?: boolean}).__META_SHELL__);

/** Where to turn the camera back on after it was blocked, for this device. */
export function cameraHelp(): string {
  if (isIOS() && inApp()) return 'On your iPhone open Settings › Facebook and turn on Camera, then come back and tap Try again.';
  if (isIOS()) return 'In Safari tap aA in the address bar › Website Settings › Camera › Allow. Or open Settings › Apps › Safari › Camera › Allow. Then tap Try again.';
  if (/Android/.test(navigator.userAgent)) return 'Tap the icon left of the address › Permissions › Camera › Allow, then tap Try again.';
  return 'Click the camera icon in the address bar, choose Allow, then try again.';
}

/** Front or back camera, no audio. Call it straight from a tap so iPhones show their permission prompt. */
export async function openCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  if (!window.isSecureContext) throw new Error('The camera only works on a secure (https) page.');
  if (!navigator.mediaDevices?.getUserMedia) throw new Error(isIOS() ? 'This browser can’t open the camera. Open the page in Safari.' : 'This browser cannot open the camera here. Upload a video instead.');
  try {
    return await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: facing}, width: {ideal: 640}, height: {ideal: 480}}});
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    throw new Error(
      name === 'NotAllowedError' || name === 'SecurityError'
        ? `Camera is off for this site. ${cameraHelp()}`
        : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'No camera found on this device.'
          : name === 'NotReadableError'
            ? 'Another app is using the camera. Close it and try again.'
            : 'Could not open the camera.',
    );
  }
}

/** Preloads the pose model so recording starts instantly (call when the camera opens). */
export const warmUp = () => getDetector().then(() => undefined);
/** Preloads Mirror's live-camera model while the player looks at the poses. */
export const warmLive = () => getLive().then(() => undefined);

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
  const [det, src] = await Promise.all([getReader(), canPlayScan ? url : local]);
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

const SCAN_RATE = 1.25;

/**
 * Plays the clip at 1.25x and runs the pose model on frames as they arrive (at most `fps` a second), then lines
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
  let det = await getLive();
  let fails = 0;
  let rebuilding = false;
  const timer = window.setInterval(() => {
    if (v.readyState < 2 || v.videoWidth === 0 || rebuilding) return;
    try {
      onPose(pose(det, v));
      fails = 0;
    } catch (e) {
      // A throwing model used to fail silently every frame (nobody ever "seen"). Log it, and after a few in a row
      // rebuild the model on the CPU, which works on phones whose GPU path doesn't.
      if (fails++ === 0) console.warn('[mirror] pose tracking failed', e);
      if (fails >= 3) {
        rebuilding = true;
        live = makeDetector(MODEL, LIVE_OPTS, 'CPU');
        live
          .then(d => (det = d))
          .catch(() => {})
          .finally(() => ((rebuilding = false), (fails = 0)));
      }
      onPose(null);
    }
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
