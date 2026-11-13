import assert from 'node:assert/strict';
import {test} from 'node:test';
import {scrubContact} from './ahead.ts';
import {findLeaks, leakCounts} from './relay-guard.ts';

const types = (text: string, ctx?: Parameters<typeof findLeaks>[1]) => findLeaks(text, ctx).map(l => l.type);

test('planted secrets are flagged', () => {
  assert.deepEqual(types('They say they weigh 182 lb now'), ['health', 'health']);
  assert.deepEqual(types('They mention my resting HR is 48'), ['health']);
  assert.deepEqual(types('They slept 5h last night'), ['health']);
  assert.ok(types('burned 650 kcal and 22% body fat, BMI 24').filter(t => t === 'health').length >= 3);
  assert.deepEqual(types('ping @jsmith'), ['contact']);
  assert.deepEqual(types('(@jsmith)'), ['contact']);
  assert.deepEqual(types('call 214-555-0199'), ['contact']);
  assert.ok(types('write to jane@x.com').includes('contact'));
  assert.ok(types('meet me at 123 Main St').includes('place'));
  assert.ok(types('I train at Gold\'s Gym on Fridays').includes('place'));
  assert.deepEqual(types('They say Jane runs with them', {names: ['Jane Doe', 'Sam Lee']}), ['name']);
  assert.deepEqual(types('They train with Priya on weekends', {raw: 'I train with Priya on weekends'}), ['name']);
});

test('training talk is not flagged', () => {
  for (const s of [
    'ran 5 km',
    '3x10 squats',
    'week 4 of the plan',
    'Tuesday tempo run',
    'Dallas',
    'I live in Dallas and run by the lake',
    'squat 100 kg for 3x5',
    '1 hr easy, then 10 strides',
    'heart rate zone 2 for 40 min',
    'sleeping in, then 10 min warmup',
    'They logged it on Strava after a Parkrun on Saturday',
  ])
    assert.deepEqual(findLeaks(s, {raw: s, names: ['Jane Doe']}), [], s);
});

test('scrubContact catches a handle in brackets; counts never carry the text', () => {
  assert.equal(scrubContact('dm me (@jsmith)'), 'dm me ([handle removed])');
  assert.deepEqual(leakCounts(findLeaks('182 lb, call 214-555-0199')), {health: 1, contact: 1});
});

test('a weight followed by the lift is a training load, not a body weight', () => {
  assert.deepEqual(findLeaks('They hit 225 lb on bench this week.', {names: [], raw: ''}), []);
  assert.deepEqual(findLeaks('They did 60 kg squats for 5x5.', {names: [], raw: ''}), []);
  assert.equal(findLeaks('They weigh 182 lb now.', {names: [], raw: ''}).length > 0, true);
});
