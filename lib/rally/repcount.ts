/**
 * Rep counting for clip proof: a TS port of repcount/ (MediaPipe pose -> one joint signal -> smoothed, hysteresis
 * down-up cycles, confidence from tempo regularity). Pure, so the phone counts for the preview and the server
 * recounts from the same signal (the server's count is the one that scores). No DB, no Muse.
 */

export const CLIP_EXERCISES = {pushup: 'elbow', squat: 'knee', lunge: 'knee', situp: 'hip', jumping_jack: 'arms_up'} as const;
export type ClipExercise = keyof typeof CLIP_EXERCISES;
export const EXERCISE_LABEL: Record<ClipExercise, string> = {pushup: 'push-ups', squat: 'squats', lunge: 'lunges', situp: 'sit-ups', jumping_jack: 'jumping jacks'};
/** Minimum swing (degrees, or torso lengths for arms_up) for movement to count at all. */
const MIN_RANGE = {elbow: 35, knee: 35, hip: 30, arms_up: 0.5} as const;
/** Below this the count is shaky (several people, overhead camera, mixed exercises): photo credit only. */
export const CONFIDENT = 0.8;

/** Quest exercise text -> a countable exercise, or null (runs, planks, holds… can't be counted from video). */
export function exerciseFor(text: string): ClipExercise | null {
  const t = text.toLowerCase();
  if (/push[\s-]?ups?/.test(t)) return 'pushup';
  if (/jumping[\s-]?jacks?/.test(t)) return 'jumping_jack';
  if (/lunges?/.test(t)) return 'lunge';
  if (/sit[\s-]?ups?|crunch/.test(t)) return 'situp';
  if (/squats?/.test(t)) return 'squat';
  return null;
}

export type Landmark = {x: number; y: number; visibility?: number};

// BlazePose indices
const L_SH = 11, R_SH = 12, L_EL = 13, R_EL = 14, L_WR = 15, R_WR = 16, L_HIP = 23, R_HIP = 24, L_KN = 25, R_KN = 26, L_AN = 27, R_AN = 28;

export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const bax = a.x - b.x, bay = a.y - b.y, bcx = c.x - b.x, bcy = c.y - b.y;
  const cos = (bax * bcx + bay * bcy) / (Math.hypot(bax, bay) * Math.hypot(bcx, bcy) + 1e-9);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}
const vis = (p: Landmark) => (p.visibility ?? 1) + 1e-3;
/** Visibility-weighted left/right average, so whichever side faces the camera dominates. */
export const side = (f: Landmark[], l: number, r: number): Landmark => {
  const wl = vis(f[l]), wr = vis(f[r]);
  return {x: (f[l].x * wl + f[r].x * wr) / (wl + wr), y: (f[l].y * wl + f[r].y * wr) / (wl + wr)};
};
export function joint(f: Landmark[], a: [number, number], b: [number, number], c: [number, number]): number {
  const wl = vis(f[b[0]]), wr = vis(f[b[1]]);
  return (angle(f[a[0]], f[b[0]], f[c[0]]) * wl + angle(f[a[1]], f[b[1]], f[c[1]]) * wr) / (wl + wr);
}

/** One value per frame for the exercise's joint; null where the pose is missing or a glitch. */
export function clipSignal(frames: (Landmark[] | null)[], exercise: ClipExercise): (number | null)[] {
  const kind = CLIP_EXERCISES[exercise];
  // core joints barely visible = pose glitch
  const ok = frames.map(f => (f && f.length >= 33 && Math.max(...[L_SH, R_SH, L_HIP, R_HIP].map(i => f[i].visibility ?? 1)) >= 0.5 ? f : null));
  if (kind !== 'arms_up') {
    return ok.map(f => {
      if (!f) return null;
      if (kind === 'elbow') return joint(f, [L_SH, R_SH], [L_EL, R_EL], [L_WR, R_WR]);
      if (kind === 'knee') return joint(f, [L_HIP, R_HIP], [L_KN, R_KN], [L_AN, R_AN]);
      return joint(f, [L_SH, R_SH], [L_HIP, R_HIP], [L_KN, R_KN]);
    });
  }
  // arms overhead, in torso lengths (one median torso length per clip, so distance to camera doesn't matter)
  const torso = ok.flatMap(f => (f ? [Math.hypot(side(f, L_HIP, R_HIP).x - side(f, L_SH, R_SH).x, side(f, L_HIP, R_HIP).y - side(f, L_SH, R_SH).y)] : []));
  const len = Math.max(torso.length ? percentile(torso, 50) : 1, 1e-3);
  return ok.map(f => (f ? (side(f, L_SH, R_SH).y - (f[L_WR].y + f[R_WR].y) / 2) / len : null));
}

export function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (p / 100) * (s.length - 1);
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
}

/** Linear interpolation over missing frames (edges take the nearest value), like np.interp. */
export function fill(x: (number | null)[]): number[] | null {
  const known = x.flatMap((v, i) => (v != null && Number.isFinite(v) ? [i] : []));
  if (!known.length) return null;
  return x.map((v, i) => {
    if (v != null && Number.isFinite(v)) return v;
    const after = known.findIndex(k => k > i);
    if (after === -1) return x[known[known.length - 1]] as number;
    if (after === 0) return x[known[0]] as number;
    const a = known[after - 1], b = known[after];
    return (x[a] as number) + (((x[b] as number) - (x[a] as number)) * (i - a)) / (b - a);
  });
}

/** Median filter (kills single-frame pose spikes), then a moving average; same length out. */
export function smooth(x: number[], fps: number, windowS = 0.2): number[] {
  const k = Math.max(1, Math.round(windowS * fps) | 1);
  if (k === 1 || x.length < k) return x;
  const pad = k >> 1;
  const at = (arr: number[], i: number) => arr[Math.min(arr.length - 1, Math.max(0, i))];
  const med = x.map((_, i) => percentile(Array.from({length: k}, (_, j) => at(x, i - pad + j)), 50));
  return med.map((_, i) => Array.from({length: k}, (_, j) => at(med, i - pad + j)).reduce((s, v) => s + v, 0) / k);
}

export type RepCount = {reps: number; bottoms: number[]; confidence: number};

/** Down-up cycles on the 5th–95th percentile range: below 0.35 then back above 0.65 is one rep (hysteresis). */
export function countSignal(raw: (number | null)[], fps: number, minRange = 0, minRepS = 0.4): RepCount {
  const filled = fill(raw);
  if (!filled) return {reps: 0, bottoms: [], confidence: 0};
  const x = smooth(filled, fps);
  const lo = percentile(x, 5), hi = percentile(x, 95);
  const rng = hi - lo;
  if (rng <= Math.max(minRange, 1e-6)) return {reps: 0, bottoms: [], confidence: 0};
  const z = x.map(v => (v - lo) / rng);
  let state: 'up' | 'down' = z[0] > 0.5 ? 'up' : 'down';
  let bottom = 0;
  let last = -1e9;
  const bottoms: number[] = [];
  z.forEach((v, i) => {
    if (state === 'up' && v < 0.35) {
      state = 'down';
      bottom = i;
    } else if (state === 'down') {
      if (v < z[bottom]) bottom = i;
      if (v > 0.65) {
        state = 'up';
        if (bottom - last >= minRepS * fps) {
          bottoms.push(bottom);
          last = bottom;
        }
      }
    }
  });
  let confidence = bottoms.length === 1 ? 0.5 : 0;
  if (bottoms.length >= 2) {
    const gaps = bottoms.slice(1).map((b, i) => b - bottoms[i]);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length);
    confidence = Math.min(1, Math.max(0, 1 - sd / (mean + 1e-9)));
  }
  return {reps: bottoms.length, bottoms, confidence: Math.round(confidence * 1000) / 1000};
}

export function countReps(signal: (number | null)[], fps: number, exercise: ClipExercise): RepCount {
  return countSignal(signal, fps, MIN_RANGE[CLIP_EXERCISES[exercise]]);
}
