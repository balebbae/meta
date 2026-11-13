import assert from 'node:assert/strict';
import {test} from 'node:test';
import {callConnected, pickIncoming, reduceCall, type CallState} from './calls.ts';

const start = {type: 'start' as const, from: 1, mode: 'voice' as const, offer: 'offer', id: 'c1'};

test('a call rings, answers once, and hangs up', () => {
  const ringing = reduceCall(null, start);
  assert.equal(ringing && typeof ringing === 'object' && ringing.phase, 'ringing');
  assert.equal(reduceCall(ringing as CallState, start), 'busy');
  assert.equal(reduceCall(ringing as CallState, {type: 'answer', from: 1, answer: 'nope'}), 'gone');
  const active = reduceCall(ringing as CallState, {type: 'answer', from: 2, answer: 'answer'});
  assert.equal(active && typeof active === 'object' && active.phase, 'active');
  assert.equal(reduceCall(active as CallState, {type: 'end'}), null);
  assert.equal(reduceCall(null, {type: 'ice', from: 2, candidate: 'x'}), 'gone');
});

test('xp is awarded once, when the other person answers', () => {
  const ringing = reduceCall(null, start) as CallState;
  const active = reduceCall(ringing, {type: 'answer', from: 2, answer: 'answer'}) as CallState;
  assert.equal(callConnected(null, ringing), false);
  assert.equal(callConnected(ringing, active), true);
  assert.equal(callConnected(active, active), false);
  assert.equal(callConnected(ringing, 'gone'), false);
});

test('an incoming ring is someone else calling', () => {
  const ringing = reduceCall(null, start) as CallState;
  assert.equal(pickIncoming([{conversationId: 4, state: ringing}], 1), null);
  assert.equal(pickIncoming([{conversationId: 4, state: ringing}], 2)?.conversationId, 4);
  assert.equal(pickIncoming([{conversationId: 4, state: {...ringing, phase: 'active'}}], 2), null);
});
