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

export type ClipFrames = {landmarks: (Landmark[] | null)[]; stills(frameIdx: number[]): Promise<string[]>; dispose(): void};

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
      lastTs = Math.max(lastTs + 1, Math.round(performance.now()));
      const pose = det.detectForVideo(v, lastTs).landmarks[0];
      landmarks.push(pose ? pose.map(p => ({x: p.x, y: p.y, visibility: p.visibility})) : null);
      if (i % 6 === 0) onProgress(i / n, 'frames');
    }
    onProgress(1, 'frames');
    return {
      landmarks,
      async stills(frameIdx) {
        const out: string[] = [];
        const c = document.createElement('canvas');
        for (const i of frameIdx.slice(0, 3)) {
          await seek(v, Math.min(duration, i / CLIP_FPS));
          const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
          c.width = Math.round(v.videoWidth * scale);
          c.height = Math.round(v.videoHeight * scale);
          c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
          out.push(c.toDataURL('image/jpeg', 0.7));
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
