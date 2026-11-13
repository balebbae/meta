import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareWeeks} from './coach-math.ts';

const NOW = Date.parse('2026-11-12T18:00:00Z');
const ago = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const run = (d: number, km = 5) => ({kind: 'run' as const, startedAt: ago(d), durationMin: 30, distanceKm: km});
const lift = (d: number) => ({kind: 'strength' as const, startedAt: ago(d), durationMin: 45});

test('fewer workouts and a dropped strength day are gaps; a longer run is a win', () => {
  const c = compareWeeks([run(1, 7), run(4), run(8), run(9), run(11), lift(12), run(13)], {now: NOW});
  assert.deepEqual([c.thisWeek.sessions, c.lastWeek.sessions], [2, 5]);
  assert.deepEqual(c.gaps.map(g => [g.metric, g.severity]).slice(0, 3), [['sessions', 'high'], ['minutes', 'high'], ['active_days', 'high']]);
  assert.ok(c.gaps.some(g => g.metric === 'strength_sessions') || c.gaps.length === 4);
  assert.deepEqual(c.wins.map(w => w.metric), ['longest_km']);
  assert.equal(c.cap.sessions, 4); // at most +2 on this week, never back to 5+1 in one go
});

test('no rest day is always a gap, and easy week shrinks the cap', () => {
  const c = compareWeeks([0, 1, 2, 3, 4, 5, 6].map(d => run(d + 0.1)), {now: NOW, easyWeek: true});
  assert.equal(c.gaps[0].metric, 'rest_days');
  assert.ok(c.cap.sessions < 7);
  assert.ok(c.rules.some(r => r.startsWith('Easy week')));
  assert.ok(compareWeeks([], {now: NOW}).rules.some(r => r.includes('consistency')));
});
