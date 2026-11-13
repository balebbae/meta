import assert from 'node:assert/strict';
import {test} from 'node:test';
import {reelGameByText} from './reel-kind.ts';
import {paceFromText} from './reel-pace.ts';

test('paceFromText reads clock paces, spoken paces and speeds, per km', () => {
  assert.deepEqual(paceFromText('Easy 5k at 5:30/km, breathe through the nose'), {secPerKm: 330, distanceKm: 5});
  assert.deepEqual(paceFromText('Hold 6 min per km for 3 km'), {secPerKm: 360, distanceKm: 3});
  assert.equal(paceFromText('8 minute miles today')?.secPerKm, 298);
  assert.equal(paceFromText("tempo: 8'00 per mile")?.secPerKm, 298);
  assert.equal(paceFromText('treadmill at 12 km/h')?.secPerKm, 300);
  assert.equal(paceFromText('3 miles easy at 9:00 a mile')?.distanceKm, 4.8);
});
test('paceFromText returns null when a Reel names no pace or an absurd one', () => {
  assert.equal(paceFromText('Sunday long run with the club'), null);
  assert.equal(paceFromText('curls 3 x 12, then 10 push-ups'), null);
  assert.equal(paceFromText('sprint at 1:10/km'), null);
});
test('running Reels are their own game; swims and gym work are not', () => {
  assert.equal(reelGameByText('5k tempo run at 5:30/km'), 'run');
  assert.equal(reelGameByText('couch to 5K week 3 jog'), 'run');
  assert.equal(reelGameByText('pool laps freestyle stroke drill'), 'swim');
  assert.equal(reelGameByText('biceps curls 3 x 12 and push-ups'), 'workout');
});
