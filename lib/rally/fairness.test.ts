import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activityFocus, bandOf, clampHandicap, fallbackScales, predictFairness} from './fairness.ts';

test('activityFocus picks the activity the workout is mostly about', () => {
  assert.equal(activityFocus('Couch to 5k: easy run, 3 km jog'), 'run');
  assert.equal(activityFocus('Plank, push-ups and squats'), 'strength');
  assert.equal(activityFocus('Morning yoga flow and stretch'), 'yoga');
  assert.equal(activityFocus('Spin class on the bike'), 'ride');
  assert.equal(activityFocus('Do something fun this week'), 'general');
});

test('bandOf reads banded, exact, boolean and withheld answers', () => {
  const a = (value: string | number | boolean | null, withheld = false) => ({question: 'runs_2w' as const, value, level: 'rounded' as const, sourceTrust: null, withheld});
  assert.equal(bandOf(a('0')), 0);
  assert.equal(bandOf(a('3-4')), 2);
  assert.equal(bandOf(a('5+')), 3);
  assert.equal(bandOf(a(1)), 1);
  assert.equal(bandOf(a(true)), 2);
  assert.equal(bandOf(a('3-4', true)), null);
  assert.equal(bandOf(null), null);
});

test('fallbackScales prefers the game activity and defaults to standard', () => {
  assert.deepEqual(fallbackScales(3, 0), {targetScale: 1.2, damageScale: 0.8});
  assert.deepEqual(fallbackScales(null, 0), {targetScale: 0.6, damageScale: 1.5});
  assert.deepEqual(fallbackScales(null, null), {targetScale: 1, damageScale: 1});
});

test('clampHandicap bounds values and never stacks both advantages', () => {
  assert.deepEqual(clampHandicap({targetScale: 3, damageScale: 0.1}), {targetScale: 1.4, damageScale: 0.7});
  assert.deepEqual(clampHandicap({targetScale: 1.3, damageScale: 1.4}), {targetScale: 1.3, damageScale: 1});
  assert.deepEqual(clampHandicap({targetScale: 0.7, damageScale: 0.8}), {targetScale: 0.7, damageScale: 1});
  assert.deepEqual(clampHandicap({targetScale: Number.NaN, damageScale: 1.2}), {targetScale: 1, damageScale: 1.2});
});

test('predictFairness: handicaps close the gap between a beginner and a regular', () => {
  const raw = predictFairness([{band: 0, damageScale: 1}, {band: 3, damageScale: 1}]);
  const balanced = predictFairness([{band: 0, damageScale: 1.5}, {band: 3, damageScale: 0.8}]);
  assert.equal(raw.label, 'lopsided');
  assert.ok(balanced.spread < raw.spread);
  assert.equal(balanced.label, 'fairly even');
  assert.equal(predictFairness([{band: 2, damageScale: 1}]).label, 'close');
});

test('readiness: green light for a match, a stretch when the activity or the level is new, nothing when unshared', async () => {
  const {readiness} = await import('./fairness.ts');
  assert.equal(readiness('run', null, null, null), null);
  assert.equal(readiness('run', 2, 2, 'regular')?.fit, 'good');
  assert.equal(readiness('run', 1, 2, 'building')?.fit, 'good');
  assert.equal(readiness('run', 0, 3, 'strong')?.fit, 'stretch'); // active, but not a runner lately
  assert.equal(readiness('general', 0, 0, 'building')?.fit, 'stretch');
  assert.equal(readiness('strength', 1, 1, 'new')?.fit, 'stretch');
  assert.equal(readiness('general', null, null, 'strong')?.fit, 'good');
  assert.doesNotMatch(readiness('run', 0, 0, 'new')!.note, /weak|slow|unfit|lazy/i);
});
