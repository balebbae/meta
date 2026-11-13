import assert from 'node:assert/strict';
import {test} from 'node:test';
import {distanceKm, locate} from './geo.ts';

test('locate prefers the landmark over its city and ignores unknown places', () => {
  assert.deepEqual(locate('Katy Trail, Dallas, TX'), {lat: 32.8054, lng: -96.8046});
  assert.deepEqual(locate('Downtown Dallas'), {lat: 32.7767, lng: -96.797});
  assert.equal(locate('Online'), null);
});

test('distanceKm: Dallas to Plano is about 28 km', () => {
  const d = distanceKm(locate('Dallas')!, locate('Plano')!);
  assert.ok(d > 26 && d < 31, String(d));
  assert.equal(distanceKm(locate('Dallas')!, locate('Dallas')!), 0);
});
