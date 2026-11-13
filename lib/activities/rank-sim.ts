/**
 * Offline replay simulator for Discover ranking (plan §5c). Synthetic users have hidden per-tag / per-type
 * click rates; their *stated* tags (what user_tags holds, and what the hand score reads) only half match them.
 * Every policy sees the same users, candidate pools and click dice, so the numbers are comparable.
 * Run: node scripts/discover-sim.mts
 */
import {armKey, rankCards, rng, type ArmStats, type RankCandidate} from './rank.ts';

const TAGS = ['Running', 'Cycling', 'Yoga', 'Lifting', 'Hiking', 'Swimming', 'Walking', 'Climbing'];
const TYPES = ['friend', 'event', 'group', 'reel'];
const TYPE_BASE: Record<string, number> = {friend: 2, event: 1.5, group: 1, reel: 0.5};

type SimCard = RankCandidate & {ctr: number};
type SimUser = {pools: SimCard[][]};
export type Policy = 'current' | 'bandit' | 'bandit+mmr';
export type SimResult = {policy: Policy; ctr: number; regret: number; ndcg: number};
export type SimOptions = {users?: number; sessions?: number; pool?: number; slots?: number; seed?: number};

const pick = <T>(xs: T[], r: () => number) => xs[Math.floor(r() * xs.length)];
/** Position discount: both the DCG weight and the chance a user looks at that slot. */
const disc = (pos: number) => 1 / Math.log2(pos + 2);

function makeUsers(o: Required<SimOptions>): SimUser[] {
  const r = rng(o.seed);
  return Array.from({length: o.users}, (_, u) => {
    const loved = [...TAGS].sort(() => r() - 0.5).slice(0, 2);
    const stale = pick(TAGS.filter(t => !loved.includes(t)), r);
    const stated = [loved[0], stale]; // one real interest + one tag they no longer care about
    const tagAff = Object.fromEntries(TAGS.map(t => [t, loved.includes(t) ? 0.3 + 0.2 * r() : 0.02 + 0.06 * r()]));
    const typeMult = Object.fromEntries(TYPES.map(t => [t, 0.6 + 0.7 * r()]));
    const pools = Array.from({length: o.sessions}, (_, s) =>
      Array.from({length: o.pool}, (_, i): SimCard => {
        const type = pick(TYPES, r);
        const tag = pick(TAGS, r);
        const quality = 0.7 + 0.6 * r();
        // the current formula: stated-tag match + popularity (weakly tied to quality) + per-section weight
        const score = (stated.includes(tag) ? 3 : 0) + 1.5 * quality + r() + TYPE_BASE[type];
        return {id: `${u}-${s}-${i}`, type, tag, score, ctr: Math.min(0.95, tagAff[tag] * typeMult[type] * quality)};
      }),
    );
    return {pools};
  });
}

const dcg = (cards: SimCard[]) => cards.reduce((s, c, p) => s + c.ctr * disc(p), 0);

function bump(stats: ArmStats, key: string, clicked: boolean) {
  const a = stats.get(key) ?? {impressions: 0, clicks: 0};
  stats.set(key, {impressions: a.impressions + 1, clicks: a.clicks + (clicked ? 1 : 0)});
}

export function simulate(opts: SimOptions = {}): SimResult[] {
  const o: Required<SimOptions> = {users: 200, sessions: 40, pool: 20, slots: 6, seed: 7, ...opts};
  const users = makeUsers(o);
  return (['current', 'bandit', 'bandit+mmr'] as Policy[]).map(policy => {
    const dice = rng(o.seed + 1);
    const global: ArmStats = new Map();
    let shown = 0;
    let clicks = 0;
    let regret = 0;
    let ndcg = 0;
    users.forEach((user, u) => {
      const mine: ArmStats = new Map();
      user.pools.forEach((pool, s) => {
        const ranked = policy === 'current' ? [...pool].sort((a, b) => b.score - a.score) : rankCards(pool, mine, global, {seed: o.seed * 1_000_003 + u * 1009 + s, diversify: policy === 'bandit+mmr'});
        const slate = ranked.slice(0, o.slots);
        const ideal = dcg([...pool].sort((a, b) => b.ctr - a.ctr).slice(0, o.slots));
        const got = dcg(slate);
        regret += ideal - got;
        ndcg += got / ideal;
        slate.forEach((c, p) => {
          const hit = dice() < c.ctr * disc(p);
          shown++;
          if (hit) clicks++;
          bump(mine, armKey(c.type, c.tag), hit);
          bump(global, armKey(c.type, c.tag), hit);
        });
      });
    });
    const sessions = o.users * o.sessions;
    return {policy, ctr: clicks / shown, regret: regret / o.users, ndcg: ndcg / sessions};
  });
}

export function table(results: SimResult[]): string {
  const rows = results.map(r => `${r.policy.padEnd(11)} | ${(r.ctr * 100).toFixed(2).padStart(6)}% | ${r.regret.toFixed(2).padStart(10)} | ${r.ndcg.toFixed(3)}`);
  return ['policy      |    CTR  | cum regret | nDCG@k', '------------|---------|------------|-------', ...rows].join('\n');
}
