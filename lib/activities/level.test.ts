import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeLevel, fitnessLevel, isSession} from './level.ts';

const NOW = Date.parse('2026-11-12T18:00:00Z');
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const run = (days: number, km = 5) => ({kind: 'run' as const, startedAt: ago(days), durationMin: 30, distanceKm: km});

test('no data is new; a steady runner over 4 weeks is regular with distance shown', () => {
  assert.equal(fitnessLevel([], NOW).tier, 'new');
  const l = fitnessLevel([27, 24, 20, 17, 13, 10, 6, 3].map(d => run(d, 6)), NOW);
  assert.equal(l.weeks, 4);
  assert.equal(l.tier, 'regular');
  assert.deepEqual([l.activities[0].kind, l.activities[0].tier, l.activities[0].kmPerWeek], ['run', 'regular', 12.4]); // 48 km over 3.9 weeks of history
  assert.match(describeLevel(l), /run: regular, about 2 a week, about 12 km a week/);
});

test('short auto-detected walks do not count; long ones do', () => {
  assert.equal(isSession({kind: 'walk', durationMin: 15}), false);
  assert.equal(isSession({kind: 'walk', durationMin: 45}), true);
  assert.equal(isSession({kind: 'sleep', durationMin: 480}), false);
  const l = fitnessLevel(Array.from({length: 20}, (_, i) => ({kind: 'walk' as const, startedAt: ago(i * 0.7), durationMin: 15})), NOW);
  assert.equal(l.perWeek, 0);
});

test('easy week: WHOOP red recovery, a training spike, or two short nights', () => {
  assert.equal(fitnessLevel([run(3), {kind: 'recovery', startedAt: ago(0.3), raw: {recovery_score: 20}}], NOW).easyWeek, 'recovery');
  assert.equal(fitnessLevel([run(3), {kind: 'recovery', startedAt: ago(0.3), raw: {recovery_score: 80}}], NOW).easyWeek, null);
  assert.equal(fitnessLevel([run(25), run(18), run(11), run(6), run(5), run(4), run(2), run(1)], NOW).easyWeek, 'spike');
  const sleep = (d: number, h: number) => ({kind: 'sleep' as const, startedAt: ago(d), durationMin: h * 60});
  assert.equal(fitnessLevel([sleep(0.5, 5), sleep(1.5, 5.5)], NOW).easyWeek, 'sleep');
  assert.equal(fitnessLevel([sleep(0.5, 7.5), sleep(1.5, 8)], NOW).sleepHours, 7.8);
});
