import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptiveAdjust, applyDamage, baseDamage, classifyMoveEvent, computeMove, contributions, damageAfterProof, gearForEvents, relayState, streakState, unlockedTiers, UNVERIFIED_PROOF} from './scoring.ts';

const spec = {
  levels: [
    {day: 1, name: 'Warm-up', exercises: [{name: 'Plank', seconds: 30}, {name: 'Squat', reps: 12}]},
    {day: 2, name: 'Push', exercises: [{name: 'Push-up', reps: 10}]},
  ],
  handicaps: [
    {userId: 1, targetScale: 1, damageScale: 1, note: ''},
    {userId: 2, targetScale: 0.6, damageScale: 1.5, note: 'scaled to your recent weeks'},
  ],
  dares: [{id: 'rain', text: 'Run in the rain', bonus: 20, needsProof: true}],
};

test('base damage grows with volume and is clamped', () => {
  assert.equal(baseDamage(undefined), 20);
  assert.equal(baseDamage(spec.levels[0]), 43); // 20 + 12 + 6 + 5
  assert.equal(baseDamage({day: 1, name: 'x', exercises: Array.from({length: 12}, () => ({name: 'a', reps: 30}))}), 80);
});

test('handicap multiplies damage; beginner hits as hard as expert', () => {
  const a = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: null});
  const b = computeMove({spec, userId: 2, levelDay: 2, sourceTrust: null});
  assert.equal(a.damage, 31);
  assert.equal(b.damage, Math.round(31 * 1.5));
  assert.equal(a.critical, false);
});

test('trust bonus is 10% for photo/device/verified', () => {
  const self = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: 'self_reported'});
  const photo = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: 'photo'});
  const device = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: 'device'});
  assert.equal(photo.damage, Math.round(self.base * 1.1));
  assert.equal(device.damage, photo.damage);
});

test('critical when the move beats the personal target by 20%+', () => {
  // level 2 target for user 1 = 10 reps; 12 reps is a critical, 11 is not
  assert.equal(computeMove({spec, userId: 1, levelDay: 2, sourceTrust: null, amount: 11}).critical, false);
  const crit = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: null, amount: 12});
  assert.equal(crit.critical, true);
  assert.equal(crit.damage, Math.round(31 * 1.5));
  // user 2's target is scaled: 10 * 0.6 = 6 -> 8 reps is a critical
  assert.equal(computeMove({spec, userId: 2, levelDay: 2, sourceTrust: null, amount: 8}).critical, true);
});

test('dare bonus is added and clamped', () => {
  const m = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: null, dareId: 'rain'});
  assert.equal(m.dareBonus, 20);
  assert.equal(m.damage, 31 + 20);
  const big = computeMove({spec: {...spec, dares: [{id: 'x', text: '', bonus: 999, needsProof: false}]}, userId: 1, levelDay: 2, sourceTrust: null, dareId: 'x'});
  assert.equal(big.dareBonus, 50);
});

test('hp never goes negative and events classify big moments', () => {
  assert.equal(applyDamage(10, 40), 0);
  assert.equal(classifyMoveEvent({critical: false, hpBefore: 600, hpAfter: 560, hpMax: 1000, levelFinished: false}), 'move');
  assert.equal(classifyMoveEvent({critical: true, hpBefore: 500, hpAfter: 460, hpMax: 1000, levelFinished: false}), 'critical');
  assert.equal(classifyMoveEvent({critical: true, hpBefore: 500, hpAfter: 460, hpMax: 1000, levelFinished: true}), 'level');
  assert.equal(classifyMoveEvent({critical: false, hpBefore: 120, hpAfter: 90, hpMax: 1000, levelFinished: false}), 'boss_low');
  assert.equal(classifyMoveEvent({critical: false, hpBefore: 30, hpAfter: 0, hpMax: 1000, levelFinished: true}), 'boss_down');
});

test('relay legs advance per team and declare a winner', () => {
  const moves = [1, 2, 1, 1].map((userId, i) => ({userId, createdAt: new Date(2026, 0, 1 + i).toISOString()}));
  const r = relayState([1, 2, 3, 4], moves, 3);
  assert.equal(r.teamOf.get(1), 'A');
  assert.equal(r.teamOf.get(2), 'B');
  assert.deepEqual(r.legs, {A: 3, B: 1});
  assert.equal(r.winner, 'A');
});

test('streak lives: a freeze absorbs the first missed day, then lives drop', () => {
  const start = '2026-03-02T00:00:00.000Z';
  const now = '2026-03-07T12:00:00.000Z';
  const moved = (d: string) => ({userId: 1, createdAt: `${d}T09:00:00.000Z`});
  const full = streakState(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'].map(moved), start, now);
  assert.equal(full.streak, 5);
  assert.equal(full.livesLeft, 3);
  const one = streakState(['2026-03-02', '2026-03-04', '2026-03-05', '2026-03-06'].map(moved), start, now);
  assert.equal(one.missed, 1);
  assert.equal(one.freezesLeft, 0);
  assert.equal(one.livesLeft, 3);
  const dead = streakState([], start, now);
  assert.equal(dead.missed, 5);
  assert.equal(dead.livesLeft, 0);
  assert.equal(dead.alive, false);
});

test('adaptive difficulty: behind -> comeback dare once, ahead -> buff boss once', () => {
  const s = {startsAt: '2026-03-02T00:00:00.000Z', endsAt: '2026-03-09T00:00:00.000Z', dares: spec.dares};
  const mid = '2026-03-05T12:00:00.000Z'; // 50% through
  assert.equal(adaptiveAdjust({spec: s, hpMax: 1000, hpLeft: 900, now: mid, alreadyBuffed: false}).type, 'comeback_dare');
  const withComeback = {...s, dares: [...s.dares, {id: 'comeback', text: '', bonus: 25, needsProof: false}]};
  assert.equal(adaptiveAdjust({spec: withComeback, hpMax: 1000, hpLeft: 900, now: mid, alreadyBuffed: false}).type, 'none');
  const buff = adaptiveAdjust({spec: s, hpMax: 1000, hpLeft: 100, now: mid, alreadyBuffed: false});
  assert.deepEqual(buff, {type: 'buff_boss', hpAdd: 100});
  assert.equal(adaptiveAdjust({spec: s, hpMax: 1000, hpLeft: 100, now: mid, alreadyBuffed: true}).type, 'none');
  assert.equal(adaptiveAdjust({spec: s, hpMax: 1000, hpLeft: 500, now: mid, alreadyBuffed: false}).type, 'none');
});

test('gear rules are deterministic', () => {
  const first = gearForEvents({owned: [], questFinished: {questId: 7, bossName: 'Plank Goblin'}});
  assert.deepEqual(first.map(g => g.slug), ['headband', 'trophy-7']);
  const second = gearForEvents({owned: ['headband', 'trophy-7'], questFinished: {questId: 8, bossName: 'Squat Golem'}, weeksStreak: 4, rainDare: true});
  assert.deepEqual(second.map(g => g.slug), ['shoes', 'trophy-8', 'cape', 'rain-jacket']);
  assert.deepEqual(gearForEvents({owned: ['cape'], weeksStreak: 6}), []);
});

test('reward tiers and MVP', () => {
  assert.deepEqual(unlockedTiers({template: 'boss', hpMax: 1000, daresDone: 0}), ['gear']);
  assert.deepEqual(unlockedTiers({template: 'streak', hpMax: 1000, daresDone: 0}), ['gear', 'discount']);
  assert.deepEqual(unlockedTiers({template: 'boss', hpMax: 4500, daresDone: 0}), ['gear', 'discount', 'equipment']);
  const c = contributions([{userId: 2, damage: 40}, {userId: 1, damage: 40}, {userId: 3, damage: 10}]);
  assert.equal(c.total, 90);
  assert.equal(c.mvp, 1);
});

test('fail closed: an unverified proof is not approved and deals no damage', () => {
  assert.equal(UNVERIFIED_PROOF.approved, false);
  assert.equal(UNVERIFIED_PROOF.status, 'pending');
  assert.equal(damageAfterProof(42, 'pending'), 0);
  assert.equal(damageAfterProof(42, 'rejected'), 0);
  assert.equal(damageAfterProof(42, 'approved'), 42);
  assert.equal(damageAfterProof(42, null), 42);
});

test('clip proof: counted reps drive the critical, clip bonus beats photo', () => {
  const photo = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: 'photo', amount: 30});
  const clip = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: 'photo', amount: 30, clip: {reps: 10}});
  const bigClip = computeMove({spec, userId: 1, levelDay: 2, sourceTrust: null, clip: {reps: 12}});
  assert.equal(photo.critical, true); // typed 30 ≥ 1.2 × 10
  assert.equal(clip.critical, false); // the camera only counted 10, so the typed 30 is ignored
  assert.ok(clip.damage > computeMove({spec, userId: 1, levelDay: 2, sourceTrust: 'photo'}).damage);
  assert.equal(bigClip.critical, true); // 12 counted ≥ 1.2 × 10
});
