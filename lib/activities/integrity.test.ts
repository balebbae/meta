import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerTrust, applyIntegrity, integrityScore} from './integrity.ts';
import type {RawEvent} from './types.ts';

const NOW = Date.UTC(2026, 10, 12, 18);
const at = new Date(NOW - 3_600_000).toISOString();

test('plausible workouts get no flags and score 1', () => {
  assert.deepEqual(integrityScore({kind: 'run', distanceKm: 10, durationMin: 50, startedAt: at}, NOW), {score: 1, flags: []});
  assert.deepEqual(integrityScore({kind: 'walk', distanceKm: 5, durationMin: 60, steps: 7000, startedAt: at}, NOW).flags, []);
  assert.deepEqual(integrityScore({kind: 'ride', distanceKm: 120, durationMin: 240, startedAt: at}, NOW).flags, []);
  assert.deepEqual(integrityScore({kind: 'steps', steps: 25_000, startedAt: at}, NOW).flags, []);
});

test('pace bounds per kind', () => {
  assert.match(integrityScore({kind: 'walk', distanceKm: 6, durationMin: 30, startedAt: at}, NOW).flags[0], /pace too fast for a walk \(12\.0 km\/h\)/);
  assert.match(integrityScore({kind: 'run', distanceKm: 10, durationMin: 20, startedAt: at}, NOW).flags[0], /pace too fast for a run/);
  assert.match(integrityScore({kind: 'ride', distanceKm: 80, durationMin: 60, startedAt: at}, NOW).flags[0], /pace too fast for a ride/);
  assert.equal(integrityScore({kind: 'run', distanceKm: 10, durationMin: 25, startedAt: at}, NOW).flags.length, 0, '24 km/h is fast but possible');
});

test('distance, duration, steps and future bounds; score drops per flag', () => {
  const r = integrityScore({kind: 'ride', distanceKm: 600, durationMin: 1500, startedAt: at}, NOW);
  assert.ok(r.flags.some(f => f.startsWith('distance too long for a ride')));
  assert.ok(r.flags.some(f => f.startsWith('duration too long')));
  assert.ok(r.score < 1);
  assert.ok(integrityScore({kind: 'walk', durationMin: 10, steps: 5000, startedAt: at}, NOW).flags[0].startsWith('too many steps for the time'));
  assert.ok(integrityScore({kind: 'steps', steps: 250_000, startedAt: at}, NOW).flags[0].startsWith('too many steps'));
  assert.deepEqual(integrityScore({kind: 'run', distanceKm: 5, durationMin: 30, startedAt: new Date(NOW + 86_400_000).toISOString()}, NOW).flags, ['starts in the future']);
  const many = integrityScore({kind: 'walk', distanceKm: 500, durationMin: 2000, steps: 900_000, startedAt: new Date(NOW + 86_400_000).toISOString()}, NOW);
  assert.equal(many.score, 0);
});

test('flagged events are downgraded to self_reported, clean ones keep their trust', () => {
  const e: RawEvent = {userId: 1, source: 'strava', externalId: 'x', kind: 'run', startedAt: at, distanceKm: 30, durationMin: 60, trust: 'device', raw: {id: 9}};
  const flagged = applyIntegrity(e, NOW);
  assert.equal(flagged.trust, 'self_reported');
  assert.equal(flagged.flags.length, 1);
  assert.deepEqual((flagged.raw as {integrity: {trust: string}; id: number}).integrity.trust, 'device');
  assert.equal((flagged.raw as {id: number}).id, 9);
  const clean = applyIntegrity({...e, distanceKm: 10}, NOW);
  assert.equal(clean.trust, 'device');
  assert.deepEqual(clean.flags, []);
});

test("trust bonus comes from today's matching event, not the best of two weeks", () => {
  const todayStart = Date.UTC(2026, 10, 12);
  const old = {kind: 'run' as const, startedAt: new Date(todayStart - 3 * 86_400_000).toISOString(), distanceKm: 10, trust: 'verified' as const};
  const today = {kind: 'walk' as const, startedAt: new Date(todayStart + 3_600_000).toISOString(), distanceKm: 2, trust: 'self_reported' as const};
  const sleep = {kind: 'sleep' as const, startedAt: new Date(todayStart + 60_000).toISOString(), trust: 'device' as const};
  assert.equal(answerTrust('completed_move_today', [old, today, sleep], todayStart), 'self_reported');
  assert.equal(answerTrust('completed_move_today', [old, sleep], todayStart), null);
  assert.equal(answerTrust('completed_run_3km_today', [old, today], todayStart), null);
  assert.equal(answerTrust('workouts_this_week', [old, today], todayStart), 'verified');
});
