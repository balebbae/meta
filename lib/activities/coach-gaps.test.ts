import {test} from 'node:test';
import assert from 'node:assert/strict';
import {goalGaps} from './coach-gaps.ts';

const NOW = Date.parse('2026-11-12T18:00:00Z');
const ago = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const run = (d: number, km = 5) => ({kind: 'run' as const, startedAt: ago(d), durationMin: Math.round(km * 6), distanceKm: km});
const lift = (d: number) => ({kind: 'strength' as const, startedAt: ago(d), durationMin: 40});
// four weeks: two runs a week (4 and 6 km), no strength
const base = [1, 4, 8, 11, 15, 18, 22, 25].map((d, i) => run(d, i % 2 ? 4 : 6));

test('a 10k goal is measured against its needs, biggest gap first, each with a capped weekly ramp', () => {
  const r = goalGaps(base, {now: NOW, goal: {title: 'City 10k', kind: '10k', weeksLeft: 8}});
  const by = Object.fromEntries(r.gaps.map(g => [g.id, g]));
  assert.deepEqual([by.runs.now, by.runs.need, by.weekly_km.now, by.long_run.now, by.long_run.need], [2, 3, 10, 6, 10]);
  assert.equal(by.strength.now, 0); assert.equal(by.strength.status, 'on_track');
  // distance never jumps more than about 10% (or the 1 km / 2 km floor) from one week to the next
  assert.deepEqual(by.long_run.ramp.map(w => w.target), [7, 8, 9, 10]);
  assert.deepEqual(by.weekly_km.ramp.map(w => w.target), [12, 14, 16, 18]);
  assert.equal(by.long_run.weeksToClose, 4);
  assert.equal(by.weekly_km.weeksToClose, 8); assert.equal(by.weekly_km.status, 'tight'); // 10 -> 25 km takes all 8 weeks left
  assert.equal(r.gaps[0].id, 'weekly_km'); // the tightest gap sorts first
  assert.match(by.long_run.next, /7 km/);
  assert.match(r.verdict, /the 8 weeks left are enough/);
  // the same runner with 5 weeks left: the distance cannot close safely, and the coach says so instead of cramming
  const late = goalGaps(base, {now: NOW, goal: {title: 'City 10k', kind: '10k', weeksLeft: 5}});
  assert.equal(late.gaps[0].id, 'weekly_km'); assert.equal(late.gaps[0].status, 'behind');
  assert.match(late.verdict, /Weekly distance cannot fully close in the 5 weeks left/);
  assert.ok(r.readiness > 30 && r.readiness < 80, String(r.readiness));
});

test('ready is ready, an easy week holds, and no rest day is always a gap', () => {
  const ready = goalGaps([...[0.5, 2, 4, 7.5, 9, 11, 14.5, 16, 18, 21.5, 23, 25].map(d => run(d, 5)), ...[3, 10, 17, 24].map(d => lift(d))], {now: NOW, goal: {title: 'Park 5k', kind: '5k', weeksLeft: 3}});
  assert.ok(ready.gaps.filter(g => g.id !== 'rest').every(g => g.status === 'closed'), JSON.stringify(ready.gaps.map(g => [g.id, g.status])));
  assert.match(ready.verdict, /You are where Park 5k needs you/);
  const easy = goalGaps(base, {now: NOW, goal: {title: 'City 10k', kind: '10k', weeksLeft: 8}, easyWeek: true});
  assert.equal(easy.gaps.find(g => g.id === 'long_run')!.ramp[0].target, 6); // holds this week
  assert.match(easy.gaps.find(g => g.id === 'long_run')!.next, /Easy week/);
  const noRest = goalGaps([0, 1, 2, 3, 4, 5, 6].map(d => run(d + 0.1, 3)), {now: NOW});
  assert.equal(noRest.gaps.find(g => g.id === 'rest')!.status !== 'closed', true);
  assert.equal(goalGaps([], {now: NOW}).gaps.some(g => g.id === 'rest'), false); // nothing logged: rest is not the problem
  assert.match(goalGaps([], {now: NOW}).verdict, /No workouts in the last four weeks/);
});
