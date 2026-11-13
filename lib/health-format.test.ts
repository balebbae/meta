import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cleanHealthSample, formatHealthValue, layoutHealth} from './health-format.ts';
import {whoopReadings} from './whoop-readings.ts';

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

test('whoop readings keep recovery, sleep stages, and the workout name', () => {
  const samples = whoopReadings({
    recovery: {records: [{created_at: '2026-11-12T08:00:00Z', score: {recovery_score: 67, resting_heart_rate: 48, hrv_rmssd_milli: 72}}]},
    sleep: {records: [{end: '2026-11-12T08:00:00Z', score: {stage_summary: {total_light_sleep_time_milli: 3_600_000, total_rem_sleep_time_milli: 3_600_000}, sleep_performance_percentage: 90}}]},
    workouts: {records: [{sport_name: 'running', start: '2026-11-12T15:00:00Z', end: '2026-11-12T15:42:00Z', score: {strain: 8.2, average_heart_rate: 140, max_heart_rate: 168, percent_recorded: 100, zone_durations: {zone_one_milli: 600000}}}]},
    body: {height_meter: 1.8, weight_kilogram: 70, max_heart_rate: 190},
  });
  assert.equal(samples.find(sample => sample.metric === 'recovery_score')?.value, 67);
  assert.equal(samples.find(sample => sample.metric === 'sleep_hours')?.value, 2);
  assert.equal(samples.find(sample => sample.metric === 'sleep_performance_pct')?.value, 90);
  assert.equal(samples.find(sample => sample.metric === 'workout_1')?.value, 42);
  assert.match(samples.find(sample => sample.metric === 'workout_1')?.unit ?? '', /^Running/);
  assert.match(samples.find(sample => sample.metric === 'workout_1')?.unit ?? '', /z 0\/10/);
  assert.equal(samples.find(sample => sample.metric === 'zone_1_min')?.value, 10);
  assert.equal(samples.find(sample => sample.metric === 'height_cm')?.value, 180);
  assert.equal(samples.find(sample => sample.metric === 'max_hr')?.value, 190);
});

test('sync only stores plain metric names', () => {
  assert.equal(cleanHealthSample({metric: 'steps', value: 10, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'})?.metric, 'steps');
  assert.equal(cleanHealthSample({metric: 'steps;drop', value: 10, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'}), null);
  assert.equal(cleanHealthSample({metric: 'steps', value: 0, unit: 'count', recordedAt: '2026-11-12T20:00:00Z'}), null);
});
