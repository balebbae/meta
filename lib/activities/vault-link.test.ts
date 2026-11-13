import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LINK_MIN, linkScore, planMerge, type LinkEvent} from './vault-link.ts';

const T = Date.UTC(2026, 10, 12, 7);
const ev = (id: number, o: Partial<LinkEvent> & {min?: number; off?: number}): LinkEvent => {
  const s = T + (o.off ?? 0) * 60_000;
  return {id, kind: 'run', trust: 'device', startedAt: new Date(s).toISOString(), endedAt: new Date(s + (o.min ?? 40) * 60_000).toISOString(), ...o};
};

test('walk/run/other link, other kinds do not', () => {
  assert.ok(linkScore(ev(1, {kind: 'walk'}), ev(2, {kind: 'run', off: 1})) >= LINK_MIN);
  assert.ok(linkScore(ev(1, {kind: 'other'}), ev(2, {kind: 'run'})) >= LINK_MIN);
  assert.equal(linkScore(ev(1, {kind: 'ride'}), ev(2, {kind: 'run'})), 0);
  assert.equal(linkScore(ev(1, {kind: 'yoga'}), ev(2, {kind: 'strength'})), 0);
});

test('overlap, duration and distance must all agree', () => {
  assert.ok(linkScore(ev(1, {distanceKm: 8}), ev(2, {off: 2, min: 39, distanceKm: 7.8})) >= LINK_MIN);
  assert.ok(linkScore(ev(1, {}), ev(2, {off: 30})) < LINK_MIN, 'only a quarter overlaps');
  assert.ok(linkScore(ev(1, {min: 60}), ev(2, {off: 10, min: 10})) < LINK_MIN, 'a 10-minute walk inside an hour run');
  assert.ok(linkScore(ev(1, {distanceKm: 8}), ev(2, {distanceKm: 3})) < LINK_MIN, 'same time, different distance');
});

test('WHOOP heart rate + Strava distance end up on one primary', () => {
  const whoop = ev(1, {kind: 'other', avgHr: 152, durationMin: 40});
  const strava = ev(2, {kind: 'run', off: 1, distanceKm: 8.1});
  const {primary, duplicates, patch} = planMerge(strava, [whoop]);
  assert.equal(primary.id, 1, 'existing row wins a trust tie');
  assert.deepEqual(duplicates.map(d => d.id), [2]);
  assert.deepEqual(patch, {distanceKm: 8.1});
});

test('a lower-trust copy never overwrites or fills a higher-trust primary', () => {
  const device = ev(1, {avgHr: 150});
  const manual = ev(2, {trust: 'self_reported', distanceKm: 12, avgHr: 170});
  const r = planMerge(manual, [device]);
  assert.equal(r.primary.id, 1);
  assert.deepEqual(r.patch, {});
  // higher trust arriving later becomes primary and keeps its own values
  const verified = ev(3, {trust: 'verified', avgHr: 140});
  const r2 = planMerge(verified, [device, manual]);
  assert.equal(r2.primary.id, 3);
  assert.deepEqual(r2.duplicates.map(d => d.id).sort(), [1, 2]);
  assert.deepEqual(r2.patch, {});
});

test('an unrelated event stays on its own', () => {
  const r = planMerge(ev(5, {}), [ev(1, {off: 300}), ev(2, {kind: 'swim'})]);
  assert.equal(r.primary.id, 5);
  assert.deepEqual(r.duplicates, []);
});
