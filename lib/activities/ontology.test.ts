import assert from 'node:assert/strict';
import {test} from 'node:test';
import fixtures from './ontology.fixtures.json' with {type: 'json'};
import {ACTIVITY_IDS, metMinutes, policyCategoryForMetric, POLICY_CATEGORY, pyRound, resolve} from './ontology.ts';

// Shared with embed/tests/test_ontology_port.py, which checks the same expectations against finetune/rally_ft/ontology.py.
test('resolve matches ontology.py fixtures', () => {
  for (const c of fixtures.resolve) assert.deepEqual(resolve(c.activity, c.intensity), c.expected, JSON.stringify(c));
});

test('metMinutes matches ontology.py fixtures (incl. Python round-half-even)', () => {
  for (const c of fixtures.met_minutes) assert.equal(metMinutes(c.activity, c.duration_min, c.intensity), c.expected, JSON.stringify(c));
});

test('pyRound follows Python round()', () => {
  assert.equal(pyRound(4.25, 1), 4.2);
  assert.equal(pyRound(0.75, 1), 0.8);
  assert.equal(pyRound(2.5, 0), 2);
  assert.equal(pyRound(-4.25, 1), -4.2);
  assert.equal(pyRound(1.15, 1), 1.1); // 1.15 is stored just below the tie
});

test('unknown activity throws, like the KeyError in Python', () => {
  assert.throws(() => resolve('quidditch'));
});

test('ontology categories map onto policy categories', () => {
  assert.equal(ACTIVITY_IDS.length, 15);
  assert.equal(policyCategoryForMetric('distance_km'), 'workouts');
  assert.equal(policyCategoryForMetric('steps'), 'steps');
  assert.equal(policyCategoryForMetric('avg_hr_bpm'), 'heart');
  assert.equal(policyCategoryForMetric('met_minutes'), 'workouts');
  assert.equal(POLICY_CATEGORY.reproductive_health, null);
});
