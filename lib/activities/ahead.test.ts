import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aheadFit, levelValue, scrubContact, targetFor} from './ahead.ts';

test('levelValue reads Answers values', () => {
  assert.equal(levelValue('about 12 km'), 12);
  assert.equal(levelValue('under 1 km'), 0.5);
  assert.equal(levelValue('3-4'), 3.5);
  assert.equal(levelValue('5+'), 5.5);
  assert.equal(levelValue('0'), 0);
  assert.equal(levelValue(7), 7);
  assert.equal(levelValue(true), null);
  assert.equal(levelValue(null), null);
});

test('a beginner (5 km, 2 days) matches someone at ~12 km, not someone at 60 km or behind', () => {
  const me = {km: 5, days: 2};
  assert.deepEqual(targetFor(me), {km: 12, days: 4});
  const near = aheadFit(me, {km: 12, days: null});
  assert.equal(near?.metric, 'km');
  assert.equal(near?.fit, 1);
  assert.equal(aheadFit(me, {km: 60, days: null}), null);
  assert.equal(aheadFit(me, {km: 4, days: 1.5}), null);
});

test('no data yet: someone active 3-4 days a week is a fit', () => {
  const fit = aheadFit({km: null, days: null}, {km: null, days: 3.5});
  assert.equal(fit?.metric, 'days');
  assert.ok((fit?.fit ?? 0) > 0.8);
});

test('scrubContact strips contact details but keeps the message', () => {
  const out = scrubContact('text me at 214-555-0199 or jo.runner@gmail.com, insta @jo_runs, strava.com/athletes/1 — easy pace!');
  assert.ok(!/214|gmail|jo_runs|strava\.com/.test(out), out);
  assert.match(out, /easy pace!/);
  assert.equal(scrubContact('run 3 x 5 km at 6:30/km'), 'run 3 x 5 km at 6:30/km');
});
