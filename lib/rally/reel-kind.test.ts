import assert from 'node:assert/strict';
import test from 'node:test';
import {isRunReel, reelGameByText} from './reel-kind.ts';

test('the seeded running Reels become runs, gym Reels do not', () => {
  const run = 'Quick beach run to boost your cardio energy! #running #cardio #outdoors runner shore coast running cardio legs outdoors beach running';
  assert.equal(reelGameByText(run), 'run');
  assert.equal(isRunReel(run, [{name: 'running'}]), true);
  assert.equal(reelGameByText('Slow tempo squats, 3 seconds down #legs #strength squat'), 'workout'); // "tempo" alone is a lifting word
  assert.equal(reelGameByText('10k steps a day challenge #walking'), 'workout');
  assert.equal(reelGameByText('Sunday 10k at 5:30/km'), 'run');
  assert.equal(isRunReel('Treadmill run then 12 burpees', [{name: 'running'}, {name: 'burpee'}]), false); // a circuit stays with the model
});
