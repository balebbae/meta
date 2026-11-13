import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_XP, decay, HALF_LIFE_DAYS, reciprocity, scoreXp, tieStrength, XP_MAX, XP_MIN} from './score.ts';
import {SCORABLE_EVENTS, xpBlockReason} from '../xp-guard.ts';

const none = {outWeight: 0, inWeight: 0, channels: 0};
const close = {outWeight: 20, inWeight: 20, channels: 6};
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('decay halves every HALF_LIFE_DAYS', () => {
  assert.equal(decay(0), 1);
  assert.equal(decay(HALF_LIFE_DAYS), 0.5);
  assert.equal(decay(2 * HALF_LIFE_DAYS), 0.25);
  assert.equal(decay(-3), 1);
});

test('reciprocity rewards both directions', () => {
  assert.equal(reciprocity(0, 0), 0);
  assert.equal(reciprocity(5, 0), 0);
  assert.equal(reciprocity(4, 2), 0.5);
  assert.ok(tieStrength({outWeight: 3, inWeight: 3, channels: 1}) > tieStrength({outWeight: 6, inWeight: 0, channels: 1}));
});

test('tie strength grows with recency and channel diversity, within 0..1', () => {
  const fresh = {outWeight: 3 * decay(1), inWeight: 3 * decay(1), channels: 1};
  const stale = {outWeight: 3 * decay(60), inWeight: 3 * decay(60), channels: 1};
  assert.ok(tieStrength(fresh) > tieStrength(stale));
  assert.ok(tieStrength({...fresh, channels: 3}) > tieStrength(fresh));
  assert.equal(tieStrength(none), 0);
  assert.ok(tieStrength(close) <= 1);
});

test('every scorable event has a base XP and stays in 1..25', () => {
  assert.deepEqual(Object.keys(BASE_XP).sort(), Object.keys(SCORABLE_EVENTS).sort());
  for (const ev of Object.keys(SCORABLE_EVENTS) as (keyof typeof SCORABLE_EVENTS)[]) {
    for (const s of [none, close, {outWeight: 1e9, inWeight: 1e9, channels: 99}, {outWeight: -5, inWeight: -5, channels: -1}]) {
      const r = scoreXp(ev, s);
      assert.ok(Number.isInteger(r.xp) && r.xp >= XP_MIN && r.xp <= XP_MAX, `${ev} ${r.xp}`);
      assert.ok(r.reason.length > 0 && r.reason.length <= 200);
    }
    assert.equal(scoreXp(ev, none).xp, BASE_XP[ev]);
    assert.ok(scoreXp(ev, close).xp > scoreXp(ev, none).xp);
  }
  assert.ok(scoreXp('voice_note', none).xp > scoreXp('reaction', none).xp);
  assert.deepEqual(scoreXp('comment', close), scoreXp('comment', close));
});

test('dedupe and caps still gate awardXp before it scores or inserts', () => {
  assert.equal(xpBlockReason({alreadyAwarded: true, todayCount: 0}, 'reaction'), 'already awarded');
  const q = read('../closeness-queries.ts');
  const award = q.slice(q.indexOf('export async function awardXp'));
  assert.ok(award.indexOf('xpBlocked(') < award.indexOf('scoreXp('));
  assert.match(award, /if \(blocked\) return \{blocked\}/);
});

test('XP paths make no model call; reactions touch Muse only inside after()', () => {
  assert.doesNotMatch(read('./score.ts'), /muse\/client|museJson|MODELS/);
  assert.doesNotMatch(read('../closeness-queries.ts'), /muse\/client|museJson|muse\/nudge/);
  const route = read('../../app/api/posts/[id]/reactions/route.ts');
  assert.doesNotMatch(route, /scoreInteraction|museJson|['/]muse\/score'/);
  assert.ok(route.indexOf('awardXp(') < route.indexOf('after('), 'XP awarded before after()');
  assert.equal(route.match(/nudgeOrNull\(/g)?.length, 1);
  assert.ok(route.indexOf('nudgeOrNull(') > route.indexOf('after('), 'nudge only inside after()');
  for (const p of ['../../app/api/muse/score/route.ts', '../../app/api/muse/transcribe/route.ts']) {
    assert.doesNotMatch(read(p), /scoreInteraction|museJson|['/]muse\/score'/);
  }
});
