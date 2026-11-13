import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fuseProof, taskExercise, type ExerciseCheck, type PoseVerdict} from './proof-fusion.ts';

const pose = (exercise: PoseVerdict['exercise'], extra: Partial<PoseVerdict> = {}): PoseVerdict => ({exercise, confidence: 0.95, abstain: false, person_found: true, reps: 10, flags: [], ...extra});
const vlm = (ok: boolean, extra: Partial<ExerciseCheck> = {}): ExerciseCheck => ({shows: 'exercise_frames', ex: ok ? 'push_up' : 'squat', match: ok, km: null, min: null, steps: null, ok, why: 'x', ...extra});

test('task text maps to an exercise label', () => {
  assert.equal(taskExercise('push-ups × 10'), 'push_up');
  assert.equal(taskExercise('15 Squats'), 'squat');
  assert.equal(taskExercise('jumping jacks x 20'), 'jumping_jack');
  assert.equal(taskExercise('Sit-ups'), 'sit_up');
  assert.equal(taskExercise('lunge'), 'lunge');
  assert.equal(taskExercise('lunge_x'), null);
  assert.equal(taskExercise('sit_up'), 'sit_up');
  assert.equal(taskExercise('run 3 km'), null);
  assert.equal(taskExercise(null), null);
});

test('pose confident and matching approves without the VLM', () => {
  const r = fuseProof({task: 'push-ups × 10', media: 'clip', pose: pose('push_up'), vlm: null});
  assert.equal(r.decision, 'approve');
  assert.equal(r.source, 'pose');
});

test('pose confident on another exercise rejects; pose "none" defers to the VLM', () => {
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('squat'), vlm: null}).decision, 'reject');
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('none'), vlm: null}).decision, 'pending');
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('none'), vlm: vlm(true)}).decision, 'approve');
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('none'), vlm: vlm(false)}).decision, 'reject');
});

test('pose and VLM agreeing keeps the pose decision', () => {
  assert.deepEqual(fuseProof({task: 'push_up', media: 'clip', pose: pose('push_up'), vlm: vlm(true)}).decision, 'approve');
  const r = fuseProof({task: 'push_up', media: 'clip', pose: pose('squat'), vlm: vlm(false)});
  assert.equal(r.decision, 'reject');
  assert.equal(r.source, 'pose+vlm');
});

test('pose and VLM disagreeing goes to pending, both ways', () => {
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('push_up'), vlm: vlm(false)}).decision, 'pending');
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('squat'), vlm: vlm(true)}).decision, 'pending');
});

test('an unclear VLM is not a disagreement', () => {
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('push_up'), vlm: vlm(false, {shows: 'unclear'})}).decision, 'approve');
});

test('pose abstains, finds no person or is missing -> VLM decides', () => {
  for (const p of [pose('push_up', {abstain: true}), pose('push_up', {person_found: false}), null, undefined]) {
    assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: p, vlm: vlm(true)}).decision, 'approve');
    assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: p, vlm: vlm(false)}).decision, 'reject');
    assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: p, vlm: vlm(true, {shows: 'unclear'})}).decision, 'pending');
    assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: p, vlm: null}).decision, 'pending');
  }
});

test('broken confidence counts as abstaining', () => {
  assert.equal(fuseProof({task: 'push_up', media: 'clip', pose: pose('squat', {confidence: Number.NaN}), vlm: null}).decision, 'pending');
});

test('photos and screens are VLM only, even if a pose result is passed', () => {
  for (const media of ['photo', 'screen'] as const) {
    assert.equal(fuseProof({task: 'push_up', media, pose: pose('squat'), vlm: vlm(true)}).decision, 'approve');
    assert.equal(fuseProof({task: 'push_up', media, pose: pose('push_up'), vlm: null}).decision, 'pending');
    assert.equal(fuseProof({task: 'run 3 km', media, pose: null, vlm: vlm(false, {shows: 'workout_screen'})}).decision, 'reject');
  }
});

test('non-body tasks and exercises the model was not trained on use the VLM', () => {
  assert.equal(fuseProof({task: 'run 3 km', media: 'clip', pose: pose('none'), vlm: vlm(true)}).decision, 'approve');
  const noSitUps = pose('push_up', {supported: ['push_up', 'squat', 'lunge', 'jumping_jack']});
  assert.equal(fuseProof({task: 'sit-ups × 20', media: 'clip', pose: noSitUps, vlm: null}).decision, 'pending');
  assert.equal(fuseProof({task: 'sit-ups × 20', media: 'clip', pose: noSitUps, vlm: vlm(true)}).decision, 'approve');
});
