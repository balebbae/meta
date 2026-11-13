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
export type Reference = {fps: number; frames: AngleFrame[]; points: PointFrame[]};
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
/** A pose counts as matched at this score (the routine moves on). */
export const MATCH_AT = 75;
const MIN_COMMON = 4;

function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = Math.atan2(a.y - b.y, a.x - b.x);
  const v2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(((v1 - v2) * 180) / Math.PI);
  if (d > 180) d = 360 - d;
  return Math.round(d);
}

const seen = (lm: Landmark[], i: number) => (lm[i].visibility ?? 1) >= 0.5;

/** One pose -> 8 angles; a joint is null when any of its 3 points is hidden. No pose -> all null. */
export function angleFrame(lm: Landmark[] | null): AngleFrame {
  if (!lm || lm.length < 29) return JOINTS.map(() => null);
  return JOINTS.map(([a, b, c]) => (seen(lm, a) && seen(lm, b) && seen(lm, c) ? angle(lm[a], lm[b], lm[c]) : null));
}

export function pointFrame(lm: Landmark[] | null): PointFrame {
  if (!lm || lm.length < 29 || !seen(lm, 11) || !seen(lm, 12) || !seen(lm, 23) || !seen(lm, 24)) return null;
  return POINT_IDS.flatMap(i => [Math.round(lm[i].x * 1000) / 1000, Math.round(lm[i].y * 1000) / 1000]);
}

export const toReference = (frames: (Landmark[] | null)[], fps: number): Reference => ({fps, frames: frames.map(angleFrame), points: frames.map(pointFrame)});

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

/** 1..100 for how close one pose is to another (the better of as-is and mirrored). About 8° average gap = 100. */
export function poseScore(target: AngleFrame, pose: AngleFrame): number {
  const cost = (swap: boolean) => {
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
  };
  const avg = Math.min(cost(false), cost(true));
  return Math.round(Math.max(1, Math.min(100, 100 * (1 - (avg - 8) / 52))));
}

/** The pose to hold for a step: the clearest frame in the middle half of its window. */
export function targetFor(ref: Reference, start: number, end: number): Target | null {
  const from = Math.max(0, Math.floor((start + (end - start) * 0.25) * ref.fps));
  const to = Math.min(ref.frames.length - 1, Math.ceil((start + (end - start) * 0.75) * ref.fps));
  let best = -1;
  let bestSeen = 0;
  for (let i = from; i <= to; i++) {
    const n = ref.frames[i]?.filter(v => v != null).length ?? 0;
    if (ref.points[i] && n > bestSeen) (best = i), (bestSeen = n);
  }
  return best >= 0 && bestSeen >= MIN_COMMON ? {angles: ref.frames[best], points: ref.points[best], at: Math.round((best / ref.fps) * 100) / 100} : null;
}

/** Grade the routine: one score per step (0 = no clear pose in the Reel, skipped), overall = average of the rest. */
export function gradeRoutine(targets: (Target | null)[], poses: AngleFrame[]): {score: number; stepScores: number[]} {
  const stepScores = targets.map((t, i) => (t ? poseScore(t.angles, poses[i] ?? []) : 0));
  const graded = stepScores.filter((_, i) => targets[i]);
  const score = graded.length ? Math.round(graded.reduce((a, b) => a + b, 0) / graded.length) : 1;
  return {score: Math.max(1, Math.min(100, score)), stepScores};
}
