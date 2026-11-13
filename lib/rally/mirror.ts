/**
 * Mirror Match maths (pure: no DB, no Muse). A pose = 8 joint angles (elbows, shoulders, hips, knees) plus 13
 * normalized points for drawing the target skeleton over the camera. The guided routine matches one target pose
 * per step; the server grades the best pose the phone captured for each step. Copying a front-facing video often
 * mirrors it, so left/right swapped also counts. Tests: mirror.test.ts.
 */
import type {Landmark} from '@/lib/rally/repcount';

export type AngleFrame = (number | null)[];
/** 13 points as [x0, y0, x1, y1, ...] in 0..1 image coordinates; null when nobody is in frame. */
export type PointFrame = number[] | null;
/** v: how the angles were measured (REF_V = 3D). References from older rules are read again. */
export type Reference = {fps: number; frames: AngleFrame[]; points: PointFrame[]; v?: number};
/**
 * A landmark plus MediaPipe's world coordinates (metres, hip-centred, 3D). Angles from these are the same whether
 * the person faces the camera or stands side-on, and don't depend on the video's aspect ratio.
 */
export type PoseLandmark = Landmark & {wx?: number; wy?: number; wz?: number};
/** Reference version: 3 = joint angles from 3D world landmarks (2D screen angles broke on viewpoint and aspect). */
export const REF_V = 3;
/** at = seconds into the clip, for the still of the Reel. */
export type Target = {angles: AngleFrame; points: PointFrame; at: number};

// BlazePose: [a, vertex, c] for each angle
const JOINTS: [number, number, number][] = [
  [11, 13, 15], // left elbow
  [12, 14, 16], // right elbow
  [13, 11, 23], // left shoulder
  [14, 12, 24], // right shoulder
  [11, 23, 25], // left hip
  [12, 24, 26], // right hip
  [23, 25, 27], // left knee
  [24, 26, 28], // right knee
];
const SWAP = [1, 0, 3, 2, 5, 4, 7, 6];
/** Points drawn for the overlay: nose, shoulders, elbows, wrists, hips, knees, ankles. */
export const POINT_IDS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
/** Skeleton edges as indexes into POINT_IDS. */
export const BONES: [number, number][] = [[1, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [9, 11], [8, 10], [10, 12]];
export const MAX_FRAMES = 360;
/** Two games share the engine: Mirror Yoga (hold the poses) and Mirror Dance (hit the moves). */
export type MirrorMode = 'dance' | 'yoga';
export const mirrorTitle = (mode: MirrorMode) => (mode === 'yoga' ? 'Mirror Yoga' : 'Mirror Dance');
/** A pose counts as matched at this score (the routine moves on). */
export const MATCH_AT = 75;
const MIN_COMMON = 4;

function angle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  if (a.wx != null && b.wx != null && c.wx != null) {
    // 3D angle at b: viewpoint- and aspect-free
    const u = [a.wx - b.wx, (a.wy ?? 0) - (b.wy ?? 0), (a.wz ?? 0) - (b.wz ?? 0)];
    const w = [c.wx - b.wx, (c.wy ?? 0) - (b.wy ?? 0), (c.wz ?? 0) - (b.wz ?? 0)];
    const len = Math.hypot(u[0], u[1], u[2]) * Math.hypot(w[0], w[1], w[2]);
    if (len > 0) return Math.round((Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / len))) * 180) / Math.PI);
  }
  // 2D fallback (no world landmarks): screen angle
  const v1 = Math.atan2(a.y - b.y, a.x - b.x);
  const v2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(((v1 - v2) * 180) / Math.PI);
  if (d > 180) d = 360 - d;
  return Math.round(d);
}

/** MediaPipe's visibility for a point we treat as seen. 0.5 threw away most side-on yoga and waist-up dance frames. */
const SEEN_AT = 0.3;
const seen = (lm: Landmark[], i: number) => (lm[i].visibility ?? 1) >= SEEN_AT;

/** One pose -> 8 angles; a joint is null when any of its 3 points is hidden. No pose -> all null. */
export function angleFrame(lm: PoseLandmark[] | null): AngleFrame {
  if (!lm || lm.length < 29) return JOINTS.map(() => null);
  return JOINTS.map(([a, b, c]) => (seen(lm, a) && seen(lm, b) && seen(lm, c) ? angle(lm[a], lm[b], lm[c]) : null));
}

/** Someone we can place: a shoulder and hip on at least one side (side-on poses hide the far side). */
export function pointFrame(lm: Landmark[] | null): PointFrame {
  if (!lm || lm.length < 29) return null;
  if (!(seen(lm, 11) && seen(lm, 23)) && !(seen(lm, 12) && seen(lm, 24))) return null;
  return POINT_IDS.flatMap(i => [Math.round(lm[i].x * 1000) / 1000, Math.round(lm[i].y * 1000) / 1000]);
}

export const toReference = (frames: (PoseLandmark[] | null)[], fps: number): Reference => ({fps, frames: frames.map(angleFrame), points: frames.map(pointFrame), v: REF_V});

const validAngles = (f: unknown): f is AngleFrame => Array.isArray(f) && f.length === JOINTS.length && f.every(v => v === null || (typeof v === 'number' && v >= 0 && v <= 180));
const validPoints = (p: unknown): p is PointFrame => p === null || (Array.isArray(p) && p.length === POINT_IDS.length * 2 && p.every(v => typeof v === 'number' && v >= -1 && v <= 2));

/** Trust boundary: the Reel's poses come from a phone. */
export function validReference(s: unknown): s is Reference {
  if (!s || typeof s !== 'object') return false;
  const {fps, frames, points} = s as Reference;
  return (
    typeof fps === 'number' && fps >= 2 && fps <= 60 &&
    Array.isArray(frames) && frames.length >= 4 && frames.length <= MAX_FRAMES && frames.every(validAngles) &&
    Array.isArray(points) && points.length === frames.length && points.every(validPoints)
  );
}

/** Trust boundary: the player's best pose for each step. */
export function validPoses(poses: unknown, steps: number): poses is AngleFrame[] {
  return Array.isArray(poses) && poses.length === steps && poses.every(validAngles);
}

/** Average angle gap between two poses, as-is or with left/right swapped (90 when too few joints are seen). */
function gap(target: AngleFrame, pose: AngleFrame, swap: boolean): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < target.length; i++) {
    const x = target[i];
    const y = pose[swap ? SWAP[i] : i];
    if (x == null || y == null) continue;
    sum += Math.abs(x - y);
    n++;
  }
  return n >= MIN_COMMON ? sum / n : 90;
}

/** 1..100 for how close one pose is to another (the better of as-is and mirrored). About 8° average gap = 100. */
export function poseScore(target: AngleFrame, pose: AngleFrame): number {
  const avg = Math.min(gap(target, pose, false), gap(target, pose, true));
  return Math.round(Math.max(1, Math.min(100, 100 * (1 - (avg - 8) / 52))));
}

/** Where each of the 8 angles sits in the overlay's points (its vertex: elbow, shoulder, hip, knee). */
export const JOINT_POINTS = [3, 4, 1, 2, 7, 8, 9, 10];
const JOINT_OK = 25;

/**
 * Per target joint: is the player within 25° of it? Same as-is/mirrored choice as poseScore, so the overlay can
 * light up the joints that are already right. null = that joint isn't seen on one side.
 */
export function jointHits(target: AngleFrame, pose: AngleFrame): (boolean | null)[] {
  const swap = gap(target, pose, true) < gap(target, pose, false);
  return target.map((x, i) => {
    const y = pose[swap ? SWAP[i] : i];
    return x == null || y == null ? null : Math.abs(x - y) <= JOINT_OK;
  });
}

/** The pose to hold for a step: the clearest frame in the middle half of its window. */
export function targetFor(ref: Reference, start: number, end: number): Target | null {
  // the clearest frame in the middle half of the step, else anywhere in the step (cuts and close-ups at the edges)
  return clearest(ref, start + (end - start) * 0.25, start + (end - start) * 0.75) ?? clearest(ref, start, end);
}

function clearest(ref: Reference, start: number, end: number): Target | null {
  const from = Math.max(0, Math.floor(start * ref.fps));
  const to = Math.min(ref.frames.length - 1, Math.ceil(end * ref.fps));
  let best = -1;
  let bestSeen = 0;
  for (let i = from; i <= to; i++) {
    const n = ref.frames[i]?.filter(v => v != null).length ?? 0;
    if (ref.points[i] && n > bestSeen) (best = i), (bestSeen = n);
  }
  return best >= 0 && bestSeen >= MIN_COMMON ? {angles: ref.frames[best], points: ref.points[best], at: Math.round((best / ref.fps) * 100) / 100} : null;
}

/**
 * Can this Reel be played? Judged per step, not over the whole clip, so intros, title cards and close-ups don't
 * sink a Reel whose poses are clear: playable when at least half the steps have a clear target pose.
 */
export function playable(ref: Reference, steps: {start: number; end: number}[]): boolean {
  if (!steps.length) return ref.points.filter(Boolean).length >= ref.frames.length * 0.25;
  const ok = steps.filter(s => targetFor(ref, s.start, s.end)).length;
  return ok >= Math.ceil(steps.length / 2);
}

/** Grade the routine: one score per step (0 = no clear pose in the Reel, skipped), overall = average of the rest. */
export function gradeRoutine(targets: (Target | null)[], poses: AngleFrame[]): {score: number; stepScores: number[]} {
  const stepScores = targets.map((t, i) => (t ? poseScore(t.angles, poses[i] ?? []) : 0));
  const graded = stepScores.filter((_, i) => targets[i]);
  const score = graded.length ? Math.round(graded.reduce((a, b) => a + b, 0) / graded.length) : 1;
  return {score: Math.max(1, Math.min(100, score)), stepScores};
}
