import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clipSignal, countReps, countSignal, exerciseFor, type Landmark} from './repcount.ts';

const FPS = 15;

/** Same synthetic side-view skeleton as repcount/tests: elbow swings 170 -> 70 -> 170 deg `reps` times. */
function pushupClip(reps: number, periodS = 2, noiseDeg = 4, leadS = 1, seed = 1): (Landmark[] | null)[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2; // deterministic, ~uniform[-1,1]
  const frames: Landmark[][] = [];
  for (let t = 0; t < leadS * 2 + reps * periodS; t += 1 / FPS) {
    const phase = Math.min(reps, Math.max(0, (t - leadS) / periodS));
    const ang = ((170 - (100 * (1 - Math.cos(2 * Math.PI * phase))) / 2 + rand() * noiseDeg * 1.7) * Math.PI) / 180;
    const f: Landmark[] = Array.from({length: 33}, () => ({x: 0, y: 0, visibility: 1}));
    for (const [sh, el, wr, hip] of [[11, 13, 15, 23], [12, 14, 16, 24]]) {
      f[sh] = {x: 0.5, y: 0.5, visibility: 1};
      f[el] = {x: 0.5, y: 0.65, visibility: 1};
      f[hip] = {x: 0.8, y: 0.52, visibility: 1};
      f[wr] = {x: 0.5 + 0.15 * Math.sin(ang), y: 0.65 - 0.15 * Math.cos(ang), visibility: 1};
    }
    frames.push(f);
  }
  return frames;
}

const count = (frames: (Landmark[] | null)[]) => countReps(clipSignal(frames, 'pushup'), FPS, 'pushup');

test('counts synthetic push-ups at different tempos and noise', () => {
  for (const [reps, period, noise] of [[1, 2, 2], [5, 2, 4], [12, 1.2, 6], [20, 0.9, 4]]) assert.equal(count(pushupClip(reps, period, noise)).reps, reps, `${reps} reps`);
});

test('regular tempo is confident; a still clip counts zero', () => {
  assert.ok(count(pushupClip(8)).confidence > 0.9);
  assert.equal(count(pushupClip(0)).reps, 0);
});

test('single-frame spikes and missing frames do not change the count', () => {
  const spiky = pushupClip(4);
  for (const i of [30, 31, 60]) spiky[i] = spiky[i]!.map((p, j) => (j === 15 || j === 16 ? {x: 0.5, y: 0.95, visibility: 1} : p));
  assert.equal(count(spiky).reps, 4);
  const gappy = pushupClip(6).map((f, i) => (i % 7 === 0 ? null : f));
  assert.equal(count(gappy).reps, 6);
});

test('a tiny wiggle is not a rep', () => {
  const x = Array.from({length: 300}, (_, i) => 160 + 5 * Math.sin((i / 299) * 20 * Math.PI));
  assert.equal(countSignal(x, FPS, 35).reps, 0);
});

test('exerciseFor maps quest text to countable exercises only', () => {
  assert.equal(exerciseFor('Dumbbell push-ups'), 'pushup');
  assert.equal(exerciseFor('Air squats'), 'squat');
  assert.equal(exerciseFor('Jumping jacks'), 'jumping_jack');
  assert.equal(exerciseFor('Plank hold'), null);
});
