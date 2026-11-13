import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stravaGameEligible, stravaPoints} from './strava-turf.ts';

test('Strava streams pair GPS with elapsed seconds and reject invalid points', () => {
  const start = '2026-01-01T00:00:00Z';
  assert.deepEqual(stravaPoints(start, {latlng: {data: [[30, -97], [30.1, -97.1]]}, time: {data: [0, 15]}}), [
    {lat: 30, lng: -97, t: Date.parse(start)}, {lat: 30.1, lng: -97.1, t: Date.parse(start) + 15000},
  ]);
  assert.deepEqual(stravaPoints(start, {}), []);
  assert.deepEqual(stravaPoints('bad', {latlng: {data: [[30, -97]]}, time: {data: [0]}}), []);
  assert.deepEqual(stravaPoints(start, {latlng: {data: [[91, 0], [0, Infinity], ['30', 0], [0, 0], [0, 0]]}, time: {data: [0, 1, 2, -1]}}), []);
});

test('only accepted players in live games receive real runs within the game window', () => {
  const game = {status: 'live', startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-01-03T00:00:00Z'};
  const activity = {start_date: game.startsAt, sport_type: 'Run'};
  const now = Date.parse('2026-01-02T00:00:00Z');
  for (const sport_type of ['Run', 'TrailRun', 'Walk', 'Hike']) assert.ok(stravaGameEligible({...activity, sport_type}, game, 'accepted', now));
  for (const sport_type of ['Ride', 'VirtualRun', 'VirtualRide', '']) assert.equal(stravaGameEligible({...activity, sport_type}, game, 'accepted', now), false);
  for (const status of ['invited', 'left', 'declined']) assert.equal(stravaGameEligible(activity, game, status, now), false);
  for (const status of ['pending', 'ended', 'cancelled']) assert.equal(stravaGameEligible(activity, {...game, status}, 'accepted', now), false);
  for (const start_date of ['bad', '2025-12-31T23:59:59Z', game.endsAt]) assert.equal(stravaGameEligible({...activity, start_date}, game, 'accepted', now), false);
  assert.equal(stravaGameEligible(activity, {...game, startsAt: null}, 'accepted', now), false);
  assert.equal(stravaGameEligible(activity, game, 'accepted', Date.parse(game.endsAt)), false);
  assert.ok(stravaGameEligible(activity, {...game, endsAt: null}, 'accepted', now));
});
