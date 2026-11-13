import assert from 'node:assert/strict';
import {test} from 'node:test';
import {armKey, GLOBAL_N, mmr, posterior, PRIOR_HI, PRIOR_LO, PRIOR_N, priorMeans, rankCards, rng, sampleBeta, similarity, type ArmStats} from './rank.ts';
import {simulate} from './rank-sim.ts';

test('rng is deterministic per seed', () => {
  const a = rng(42);
  const b = rng(42);
  const xs = Array.from({length: 5}, () => a());
  assert.deepEqual(xs, Array.from({length: 5}, () => b()));
  assert.ok(xs.every(x => x >= 0 && x < 1));
  assert.notEqual(rng(43)(), xs[0]);
});

test('sampleBeta matches the Beta mean, including shape < 1', () => {
  for (const [a, b] of [[2, 5], [0.5, 0.5], [30, 3]]) {
    const r = rng(1);
    let sum = 0;
    for (let i = 0; i < 20_000; i++) sum += sampleBeta(a, b, r);
    assert.ok(Math.abs(sum / 20_000 - a / (a + b)) < 0.01, `Beta(${a}, ${b})`);
  }
});

test('posterior = hand-score prior + capped global + user counts', () => {
  assert.deepEqual(posterior(0.25, undefined, undefined), {alpha: 1 + PRIOR_N * 0.25, beta: 1 + PRIOR_N * 0.75});
  const p = posterior(0.25, {impressions: 10, clicks: 4}, undefined);
  assert.equal(p.alpha, 1 + PRIOR_N * 0.25 + 4);
  assert.equal(p.beta, 1 + PRIOR_N * 0.75 + 6);
  // 1000 global impressions only weigh GLOBAL_N
  const g = posterior(0.25, undefined, {impressions: 1000, clicks: 500});
  assert.ok(Math.abs(g.alpha + g.beta - (2 + PRIOR_N + GLOBAL_N)) < 1e-9);
  // clicks > impressions (racy logs) never yield negative misses
  assert.equal(posterior(0.5, {impressions: 1, clicks: 3}, undefined).beta, 1 + PRIOR_N * 0.5);
});

test('priorMeans maps hand scores onto [PRIOR_LO, PRIOR_HI]', () => {
  const near = (xs: number[], ys: number[]) => assert.ok(xs.every((x, i) => Math.abs(x - ys[i]) < 1e-9), `${xs} vs ${ys}`);
  const mid = (PRIOR_LO + PRIOR_HI) / 2;
  near(priorMeans([0, 5, 10]), [PRIOR_LO, mid, PRIOR_HI]);
  near(priorMeans([3, 3]), [mid, mid]);
});

test('mmr keeps one tag from taking over; lambda = 1 is plain relevance order', () => {
  const items = [
    {id: 'a', type: 'group', tag: 'Running', score: 0},
    {id: 'b', type: 'group', tag: 'Running', score: 0},
    {id: 'c', type: 'group', tag: 'Running', score: 0},
    {id: 'd', type: 'group', tag: 'Yoga', score: 0},
  ];
  const rel = [1, 0.95, 0.9, 0.7];
  assert.deepEqual(mmr(items, rel, similarity, 0.7).map(x => x.id), ['a', 'd', 'b', 'c']);
  assert.deepEqual(mmr(items, rel, similarity, 1).map(x => x.id), ['a', 'b', 'c', 'd']);
});

test('rankCards: seeded, a permutation, and learns from clicks over the hand score', () => {
  const cards = [
    {id: 'run', type: 'group', tag: 'Running', score: 10},
    {id: 'yoga', type: 'group', tag: 'Yoga', score: 0},
    {id: 'swim', type: 'event', tag: 'Swimming', score: 5},
  ];
  const none: ArmStats = new Map();
  const once = rankCards(cards, none, none, {seed: 9}).map(c => c.id);
  assert.deepEqual(rankCards(cards, none, none, {seed: 9}).map(c => c.id), once);
  assert.deepEqual([...once].sort(), ['run', 'swim', 'yoga']);
  // cold start: the hand score's top card usually leads
  let runFirst = 0;
  for (let s = 0; s < 200; s++) if (rankCards(cards, none, none, {seed: s})[0].id === 'run') runFirst++;
  assert.ok(runFirst > 120, `run first ${runFirst}/200`);
  // this user ignores Running and clicks Yoga
  const user: ArmStats = new Map([
    [armKey('group', 'Running'), {impressions: 60, clicks: 0}],
    [armKey('group', 'yoga'), {impressions: 60, clicks: 30}],
  ]);
  let yogaFirst = 0;
  for (let s = 0; s < 200; s++) if (rankCards(cards, user, none, {seed: s})[0].id === 'yoga') yogaFirst++;
  assert.ok(yogaFirst > 175, `yoga first ${yogaFirst}/200`);
});

test('simulator: the bandit beats the current formula on CTR, regret and nDCG', () => {
  const [current, bandit, withMmr] = simulate({users: 200, sessions: 40});
  assert.equal(current.policy, 'current');
  for (const b of [bandit, withMmr]) {
    assert.ok(b.ctr >= current.ctr, `${b.policy} CTR ${b.ctr} < ${current.ctr}`);
    assert.ok(b.regret <= current.regret, `${b.policy} regret ${b.regret} > ${current.regret}`);
    assert.ok(b.ndcg >= current.ndcg, `${b.policy} nDCG ${b.ndcg} < ${current.ndcg}`);
  }
});
