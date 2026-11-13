/**
 * Proof fusion: combine the on-device pose classifier (repcount/repcount/classify.py, model JSON
 * repcount/model/exercise_clf.json) with the vision LLM's exercise_check verdict
 * (finetune/rally_ft/tasks/exercise_check.py) into one approve | reject | pending decision. Pure; tests in
 * proof-fusion.test.ts.
 *
 * Rules (in order):
 * 1. No clip (photo or workout screen): the pose model can't see motion, so the VLM decides alone.
 * 2. Today's task isn't a body exercise the pose model knows (e.g. "run 3 km", or sit-ups before the model has
 *    sit-up training data): VLM alone.
 * 3. Pose is usable (person found, not abstaining):
 *    - VLM present with an opinion (shows != unclear) that disagrees with pose -> pending (human/Muse review).
 *    - pose exercise == task -> approve (no VLM needed).
 *    - pose exercise != task (another tracked exercise) -> reject.
 *    - pose says "none": VLM decides (a confident "none" misfired on real lunges in testing, so it never rejects alone).
 * 4. Pose abstains, found no person, or is missing: VLM alone.
 * VLM alone: missing or "unclear" -> pending; ok -> approve; otherwise reject. Fails closed: nothing is approved
 * without a positive signal.
 */
import type {ProofResult} from './proof.ts';

export const BODY_EXERCISES =['push_up', 'squat', 'lunge', 'jumping_jack', 'sit_up'] as const;
export type BodyExercise = (typeof BODY_EXERCISES)[number];

/** Output of repcount classify() (snake_case, as the Python/JSON emits it). */
export type PoseVerdict = {
  exercise: BodyExercise | 'none';
  confidence: number;
  abstain: boolean;
  person_found: boolean;
  reps?: number | null;
  flags?: string[];
  /** Exercises the model was trained on; defaults to all body exercises. */
  supported?: string[];
};

/** exercise_check schema (the VLM's JSON). */
export type ExerciseCheck = {
  shows: 'exercise_frames' | 'workout_screen' | 'race_bib' | 'not_a_workout' | 'unclear';
  ex: string;
  match: boolean;
  km: number | null;
  min: number | null;
  steps: number | null;
  ok: boolean;
  why: string;
};

export type ProofMedia = 'clip' | 'photo' | 'screen';
export type FusionDecision = 'approve' | 'reject' | 'pending';
export type FusionResult = {decision: FusionDecision; reason: string; source: 'pose' | 'vlm' | 'pose+vlm' | 'none'};

export type FusionInput = {
  /** Today's task: an exercise_check label (push_up, ...) or free task text ("push-ups × 10"); null if unknown. */
  task: string | null;
  media: ProofMedia;
  pose: PoseVerdict | null | undefined;
  vlm: ExerciseCheck | null | undefined;
};

const TASK_WORDS: [RegExp, BodyExercise][] = [
  [/push[\s-]?ups?\b|press[\s-]?ups?\b/i, 'push_up'],
  [/sit[\s-]?ups?\b|crunch/i, 'sit_up'],
  [/jumping[\s_-]?jacks?\b|star[\s-]?jumps?\b/i, 'jumping_jack'],
  [/\blunges?\b/i, 'lunge'],
  [/\bsquats?\b/i, 'squat'],
];

/** Map a task label or task text to a body exercise, or null (runs, walks, screens, unknown). */
export function taskExercise(task: string | null | undefined): BodyExercise | null {
  if (!task) return null;
  const t = task.trim();
  if ((BODY_EXERCISES as readonly string[]).includes(t)) return t as BodyExercise;
  for (const [re, ex] of TASK_WORDS) if (re.test(t)) return ex;
  return null;
}

const label = (ex: string) => ex.replace(/_/g, '-');

function vlmOnly(vlm: ExerciseCheck | null | undefined, why: string): FusionResult {
  if (!vlm) return {decision: 'pending', reason: `${why}; no vision check yet`, source: 'none'};
  if (vlm.shows === 'unclear') return {decision: 'pending', reason: `${why}; vision check unclear`, source: 'vlm'};
  return vlm.ok
    ? {decision: 'approve', reason: `${why}; vision check matches the task`, source: 'vlm'}
    : {decision: 'reject', reason: `${why}; vision check does not match the task`, source: 'vlm'};
}

export function poseUsable(pose: PoseVerdict, task: BodyExercise): boolean {
  if (pose.abstain || !pose.person_found) return false;
  if (!Number.isFinite(pose.confidence) || pose.confidence <= 0 || pose.confidence > 1) return false;
  return (pose.supported ?? BODY_EXERCISES).includes(task);
}

export function fuseProof({task, media, pose, vlm}: FusionInput): FusionResult {
  if (media !== 'clip') return vlmOnly(vlm, media === 'screen' ? 'Workout screen' : 'Photo');
  const ex = taskExercise(task);
  if (!ex) return vlmOnly(vlm, 'Task is not a tracked body exercise');
  if (!pose) return vlmOnly(vlm, 'No pose result');
  if (!poseUsable(pose, ex)) return vlmOnly(vlm, pose.person_found ? 'Pose unsure' : 'Pose found no person');
  // a confident "none" was the pose model's only error mode on the test split (real lunges), so it never rejects alone
  if (pose.exercise === 'none') return vlmOnly(vlm, 'Pose sees no tracked exercise');
  const poseMatch = pose.exercise === ex;
  const seen = label(pose.exercise);
  const vlmOpinion = vlm && vlm.shows !== 'unclear' ? vlm.ok : null;
  if (vlmOpinion !== null && vlmOpinion !== poseMatch) {
    return {decision: 'pending', reason: `Pose sees ${seen} but vision check ${vlmOpinion ? 'approves' : 'disagrees'}; needs review`, source: 'pose+vlm'};
  }
  const source = vlmOpinion === null ? 'pose' : 'pose+vlm';
  return poseMatch
    ? {decision: 'approve', reason: `Pose sees ${seen}, matching the task`, source}
    : {decision: 'reject', reason: `Pose sees ${seen}, not ${label(ex)}`, source};
}

const STATUS = {approve: 'approved', reject: 'rejected', pending: 'pending'} as const;

/**
 * Server side of clip proof. The pose verdict is computed on the phone, so it is client-supplied and forgeable:
 * it may reject alone (a cheater gains nothing from that), but approval always needs the server-side vision check
 * of the stills to agree. A vision check that couldn't run (Muse offline/error, status 'pending') leaves the proof
 * pending, so it deals no damage (fail closed).
 */
export async function fuseClipProof(task: string, pose: PoseVerdict | null, check: () => Promise<ProofResult>): Promise<{status: ProofResult['status']; verdict: string; museUsed: boolean}> {
  const alone = fuseProof({task, media: 'clip', pose, vlm: null});
  if (alone.source !== 'none' && alone.decision === 'reject') return {status: 'rejected', verdict: alone.reason, museUsed: false};
  const r = await check();
  const ok = r.status === 'approved';
  if (r.status === 'pending') return {status: 'pending', verdict: r.verdict || 'Vision check unavailable: proof saved, it counts once verified.', museUsed: r.museUsed};
  const vlm: ExerciseCheck = {shows: 'exercise_frames', ex: ok ? task : 'other', match: ok, km: null, min: null, steps: null, ok, why: r.verdict};
  const f = fuseProof({task, media: 'clip', pose, vlm});
  return {status: STATUS[f.decision], verdict: r.verdict ? `${f.reason}. ${r.verdict}` : f.reason, museUsed: r.museUsed};
}
