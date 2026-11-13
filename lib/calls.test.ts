import assert from 'node:assert/strict';
import {test} from 'node:test';
import {reduceCall, type CallState} from './calls.ts';

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
