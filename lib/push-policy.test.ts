import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COLLAPSE_MS, pushDecision} from './push-policy.ts';

const NOW = 1_000_000_000;

test('daytime: first push buzzes, a repeat on the same tag within 2 min replaces quietly', () => {
  assert.deepEqual(pushDecision('conv-4', undefined, NOW, 14), {send: true, urgency: 'high', silent: false, renotify: true});
  assert.deepEqual(pushDecision('conv-4', NOW - 30_000, NOW, 14), {send: true, urgency: 'high', silent: false, renotify: false});
  assert.equal((pushDecision('conv-4', NOW - COLLAPSE_MS, NOW, 14) as {renotify: boolean}).renotify, true, 'window over');
});

test('quiet hours 22:00-07:00: messages arrive silent and low urgency, everything else waits', () => {
  for (const h of [22, 23, 0, 3, 6]) {
    assert.deepEqual(pushDecision('conv-4', undefined, NOW, h), {send: true, urgency: 'low', silent: true, renotify: false}, `hour ${h}`);
    assert.deepEqual(pushDecision('game-9', undefined, NOW, h), {send: false}, `hour ${h}`);
  }
  assert.equal(pushDecision('game-9', undefined, NOW, 7).send, true);
  assert.equal(pushDecision('game-9', undefined, NOW, 21).send, true);
});

test('no known timezone means no quiet hours', () => {
  const d = pushDecision('rally-1', undefined, 0, null);
  assert.equal(d.send, true);
  assert.ok(d.send && d.urgency === 'high' && !d.silent);
});
