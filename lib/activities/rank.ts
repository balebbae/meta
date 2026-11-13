/**
 * Discover ranking (plan §5c): Thompson sampling over (card type, tag) arms, with the hand-written card score
 * as the Beta prior, then an MMR re-rank so one tag or section can't take over. Pure (no DB) and seedable,
 * so node --test and the offline simulator (rank-sim.ts) run the exact code the page uses.
 */
export type Arm = {impressions: number; clicks: number};
export type ArmStats = Map<string, Arm>;
export type RankCandidate = {id: string; type: string; tag?: string | null; score: number};

/** Prior mean CTR spans [PRIOR_LO, PRIOR_HI] from the lowest to the highest hand score in the list. */
export const PRIOR_LO = 0.05;
export const PRIOR_HI = 0.35;
/** Pseudo-impressions the hand score is worth; real clicks outweigh it after a few dozen views. */
export const PRIOR_N = 40;
/** Global (all users) counts are capped at this many pseudo-impressions, so they only steer cold starts. */
export const GLOBAL_N = 20;
/** This user's clicks on the same tag in other card types count up to this many pseudo-impressions (tastes are mostly per tag). */
export const TAG_N = 30;
export const MMR_LAMBDA = 0.85;

export const armKey = (type: string, tag?: string | null) => `${type}:${(tag ?? '').toLowerCase()}`;

/** mulberry32: tiny seeded PRNG in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function normal(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/** Marsaglia–Tsang Gamma(shape, 1); shape < 1 via the u^(1/shape) boost. */
export function sampleGamma(shape: number, rand: () => number): number {
  if (shape < 1) return sampleGamma(shape + 1, rand) * Math.pow(1 - rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - rand();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}

export function sampleBeta(alpha: number, beta: number, rand: () => number): number {
  const x = sampleGamma(alpha, rand);
  return x / (x + sampleGamma(beta, rand));
}

/** Counts shrunk to at most `cap` pseudo-impressions, as [clicks, misses]. */
function capped(a: Arm | undefined, cap: number): [number, number] {
  if (!a || a.impressions <= 0) return [0, 0];
  const w = Math.min(1, cap / a.impressions);
  return [a.clicks * w, Math.max(0, a.impressions - a.clicks) * w];
}

/**
 * Beta(alpha, beta) for one card: hand-score prior + global counts (cold start) + this user's same-tag counts from
 * other card types (both capped) + this user's own counts for the arm.
 */
export function posterior(priorMean: number, user: Arm | undefined, global: Arm | undefined, userTag?: Arm): {alpha: number; beta: number} {
  const [gc, gm] = capped(global, GLOBAL_N);
  const [tc, tm] = capped(userTag && {impressions: userTag.impressions - (user?.impressions ?? 0), clicks: userTag.clicks - (user?.clicks ?? 0)}, TAG_N);
  const [uc, um] = capped(user, Infinity);
  return {alpha: 1 + PRIOR_N * priorMean + gc + tc + uc, beta: 1 + PRIOR_N * (1 - priorMean) + gm + tm + um};
}

/** Per-tag totals across card types, keyed like armKey('*', tag). */
function byTag(stats: ArmStats): ArmStats {
  const out: ArmStats = new Map();
  for (const [key, a] of stats) {
    const k = armKey('*', key.slice(key.indexOf(':') + 1));
    const t = out.get(k) ?? {impressions: 0, clicks: 0};
    out.set(k, {impressions: t.impressions + a.impressions, clicks: t.clicks + a.clicks});
  }
  return out;
}

/** Hand scores min-max scaled to prior CTRs; a flat list gets the midpoint. */
export function priorMeans(scores: number[]): number[] {
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  return scores.map(s => PRIOR_LO + (PRIOR_HI - PRIOR_LO) * (hi > lo ? (s - lo) / (hi - lo) : 0.5));
}

/** Same tag (when set) = 1, same card type = 0.3, else 0. */
export function similarity(a: RankCandidate, b: RankCandidate): number {
  if (a.tag && b.tag && a.tag.toLowerCase() === b.tag.toLowerCase()) return 1;
  return a.type === b.type ? 0.3 : 0;
}

/** Greedy MMR: pick argmax lambda*rel - (1-lambda)*max sim to anything already picked. rel is rescaled to [0, 1]. */
export function mmr<T>(items: T[], rel: number[], sim: (a: T, b: T) => number, lambda = MMR_LAMBDA): T[] {
  const max = Math.max(...rel, 1e-9);
  const left = items.map((item, i) => ({item, rel: rel[i] / max}));
  const out: T[] = [];
  while (left.length) {
    let best = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < left.length; i++) {
      const penalty = out.length ? Math.max(...out.map(o => sim(left[i].item, o))) : 0;
      const val = lambda * left[i].rel - (1 - lambda) * penalty;
      if (val > bestVal) [best, bestVal] = [i, val];
    }
    out.push(left.splice(best, 1)[0].item);
  }
  return out;
}

export type RankOptions = {seed: number; lambda?: number; diversify?: boolean};

/** Thompson-sample a CTR per card, then MMR. Returns the same cards, reordered. */
export function rankCards<T extends RankCandidate>(cards: T[], user: ArmStats, global: ArmStats, {seed, lambda = MMR_LAMBDA, diversify = true}: RankOptions): T[] {
  if (cards.length < 2) return cards;
  const rand = rng(seed);
  const means = priorMeans(cards.map(c => c.score));
  const tags = byTag(user);
  const theta = cards.map((c, i) => {
    const key = armKey(c.type, c.tag);
    const {alpha, beta} = posterior(means[i], user.get(key), global.get(key), c.tag ? tags.get(armKey('*', c.tag)) : undefined);
    return sampleBeta(alpha, beta, rand);
  });
  if (diversify) return mmr(cards, theta, similarity, lambda);
  return cards.map((c, i) => ({c, t: theta[i]})).sort((a, b) => b.t - a.t).map(x => x.c);
}
