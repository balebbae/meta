import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cleanHealthSample, formatHealthValue, layoutHealth} from './health-format.ts';

test('health values read as hours, distance, and counts', () => {
  assert.equal(formatHealthValue('hours', 7.4), '7h 24m');
  assert.equal(formatHealthValue('m', 1543), '1.54 km');
  assert.equal(formatHealthValue('count', 7432), '7,432');
  assert.equal(formatHealthValue('min', 42), '42 min');
});

test('layout highlights steps and names each workout', () => {
  const layout = layoutHealth([
    {metric: 'steps', value: 100, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'},
    {metric: 'workout_1', value: 42, unit: 'Running', recordedAt: '2026-11-12T20:00:00Z'},
    {metric: 'bp_systolic', value: 120, unit: 'mmHg', recordedAt: '2026-11-12T20:00:00Z'},
    {metric: 'bp_diastolic', value: 78, unit: 'mmHg', recordedAt: '2026-11-12T20:00:00Z'},
  ]);
  assert.equal(layout.highlights[0]?.label, 'Steps');
  assert.equal(layout.highlights[0]?.value, '100');
  assert.equal(layout.sections.find(section => section.title === 'Workouts')?.rows[0]?.label, 'Running');
  assert.equal(layout.sections.find(section => section.title === 'Workouts')?.rows[0]?.value, '42 min');
  assert.equal(layout.sections.find(section => section.title === 'Vitals')?.rows[0]?.value, '120/78 mmHg');
});

test('sync only stores plain metric names', () => {
  assert.equal(cleanHealthSample({metric: 'steps', value: 10, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'})?.metric, 'steps');
  assert.equal(cleanHealthSample({metric: 'steps;drop', value: 10, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'}), null);
  assert.equal(cleanHealthSample({metric: 'steps', value: 0, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'}), null);
});
