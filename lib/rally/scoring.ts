/**
 * Rally scoring engine (spec §15). Pure, deterministic functions: no DB, no Muse. Every input here is
 * already an Answer-level value (banded / boolean), never raw vault data. Unit tests: scoring.test.ts.
 */
import type {GameSpec, Trust} from '@/lib/activities/types';

export const LIMITS = {
  reps: [5, 30],
  seconds: [15, 90],
  bossHp: [500, 5000],
  bonus: [5, 50],
  targetScale: [0.5, 1.5],
  damageScale: [0.5, 2.0],
} as const;

export const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export const TRUST_BONUS: Record<Trust, number> = {self_reported: 1, photo: 1.1, device: 1.1, verified: 1.1};
/** A confident camera-counted clip beats a photo: the reps were counted, not typed. */
export const CLIP_BONUS = 1.25;
export const CRITICAL_MULTIPLIER = 1.5;
export const CRITICAL_THRESHOLD = 1.2;

export type Level = GameSpec['levels'][number];

/** Base damage of one completed level: 20 + 6 per exercise + volume, clamped 20..80. */
export function baseDamage(level: Level | undefined): number {
  if (!level || level.exercises.length === 0) return 20;
  const volume = level.exercises.reduce((s, e) => s + (e.reps ?? 0) * 0.5 + (e.seconds ?? 0) / 6, 0);
  return Math.round(clamp(20 + 6 * level.exercises.length + volume, [20, 80]));
}

export type MoveInput = {
  spec: Pick<GameSpec, 'levels' | 'handicaps' | 'dares'>;
  userId: number;
  /** Which level (1-based day) the move counts for. */
  levelDay: number;
  /** Best trust the Answers API reported for the owner's move today (null = unknown/self reported). */
  sourceTrust: Trust | null;
  /** Optional effort the player typed (reps, seconds or minutes). Only used for the critical check. */
  amount?: number | null;
  /** Dare id when this move is a dare. */
  dareId?: string | null;
  /** Confident clip proof: its counted reps replace the typed amount and the clip bonus replaces trust. */
  clip?: {reps: number} | null;
};

export type MoveResult = {damage: number; critical: boolean; base: number; damageScale: number; dareBonus: number};

export function handicapFor(spec: Pick<GameSpec, 'handicaps'>, userId: number) {
  return spec.handicaps.find(h => h.userId === userId) ?? {userId, targetScale: 1, damageScale: 1, note: ''};
}

/** Personal target for a level: the biggest rep/second number scaled by targetScale. */
export function personalTarget(level: Level | undefined, targetScale: number): number | null {
  if (!level) return null;
  const nums = level.exercises.map(e => e.reps ?? e.seconds ?? 0).filter(n => n > 0);
  if (!nums.length) return null;
  return Math.max(1, Math.round(Math.max(...nums) * targetScale));
}

export function computeMove(input: MoveInput): MoveResult {
  const level = input.spec.levels.find(l => l.day === input.levelDay) ?? input.spec.levels[input.spec.levels.length - 1];
  const base = baseDamage(level);
  const h = handicapFor(input.spec, input.userId);
  const trust = input.clip ? CLIP_BONUS : TRUST_BONUS[input.sourceTrust ?? 'self_reported'];
  const target = personalTarget(level, h.targetScale);
  const amount = input.clip ? input.clip.reps : input.amount;
  const critical = target != null && amount != null && amount >= target * CRITICAL_THRESHOLD;
  const dare = input.dareId ? input.spec.dares.find(d => d.id === input.dareId) : undefined;
  const dareBonus = dare ? clamp(dare.bonus, LIMITS.bonus) : 0;
  let damage = base * h.damageScale * trust;
  if (critical) damage *= CRITICAL_MULTIPLIER;
  damage += dareBonus;
  return {damage: Math.max(1, Math.round(damage)), critical, base, damageScale: h.damageScale, dareBonus};
}

export function applyDamage(hpLeft: number, damage: number): number {
  return Math.max(0, hpLeft - damage);
}

export type BossEvent = 'move' | 'critical' | 'boss_low' | 'boss_down' | 'level';

/** Which card the thread gets for a move. boss_down > boss_low > level > critical > move. */
export function classifyMoveEvent(opts: {critical: boolean; hpBefore: number; hpAfter: number; hpMax: number; levelFinished: boolean}): BossEvent {
  if (opts.hpAfter <= 0 && opts.hpBefore > 0) return 'boss_down';
  if (opts.hpAfter > 0 && opts.hpAfter / opts.hpMax < 0.1 && opts.hpBefore / opts.hpMax >= 0.1) return 'boss_low';
  if (opts.levelFinished) return 'level';
  if (opts.critical) return 'critical';
  return 'move';
}

export const isBigMoment = (e: BossEvent) => e !== 'move';

// ---- Relay (§15.2) ----------------------------------------------------------

export type MoveLike = {userId: number; createdAt: string; kind?: 'move' | 'dare'};

/** Members alternate into two teams (A: even index, B: odd). Each move advances the team one leg. */
export function relayState(memberIds: number[], moves: MoveLike[], totalLegs: number) {
  const teamOf = new Map<number, 'A' | 'B'>();
  memberIds.forEach((id, i) => teamOf.set(id, i % 2 === 0 ? 'A' : 'B'));
  const legs = {A: 0, B: 0};
  for (const m of moves) {
    const t = teamOf.get(m.userId);
    if (t) legs[t] = Math.min(totalLegs, legs[t] + 1);
  }
  const winner = legs.A >= totalLegs && legs.B >= totalLegs ? 'tie' : legs.A >= totalLegs ? 'A' : legs.B >= totalLegs ? 'B' : null;
  return {teamOf, legs, totalLegs, winner};
}

// ---- Streak (§15.2) ---------------------------------------------------------

export const STREAK_LIVES = 3;
export const STREAK_FREEZES = 1;

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/** One move per day; a missed day burns a freeze first, then a life. Today never counts as missed. */
export function streakState(moves: MoveLike[], startsAt: string, now: string) {
  const days = new Set(moves.map(m => dayKey(m.createdAt)));
  const start = new Date(dayKey(startsAt));
  const today = dayKey(now);
  let missed = 0;
  let streak = 0;
  for (let d = new Date(start); dayKey(d.toISOString()) < today; d.setUTCDate(d.getUTCDate() + 1)) {
    if (days.has(dayKey(d.toISOString()))) streak += 1;
    else {
      missed += 1;
      streak = 0;
    }
  }
  if (days.has(today)) streak += 1;
  const freezesLeft = Math.max(0, STREAK_FREEZES - missed);
  const livesLeft = Math.max(0, STREAK_LIVES - Math.max(0, missed - STREAK_FREEZES));
  return {streak, missed, freezesLeft, livesLeft, alive: livesLeft > 0};
}

// ---- Adaptive difficulty (§15.3) ----------------------------------------------

export type AdaptiveAction = {type: 'comeback_dare'; dare: GameSpec['dares'][number]} | {type: 'buff_boss'; hpAdd: number} | {type: 'none'};

const COMEBACK_ID = 'comeback';

/**
 * Behind by 25%+ of the expected pace -> one comeback side quest (added once). 35%+ ahead -> boss gets
 * +10% of max hp (added once). Expected pace is linear from startsAt to endsAt.
 */
export function adaptiveAdjust(opts: {spec: Pick<GameSpec, 'startsAt' | 'endsAt' | 'dares'>; hpMax: number; hpLeft: number; now: string; alreadyBuffed: boolean}): AdaptiveAction {
  const start = new Date(opts.spec.startsAt).getTime();
  const end = new Date(opts.spec.endsAt).getTime();
  const t = new Date(opts.now).getTime();
  if (!(end > start) || t <= start || opts.hpLeft <= 0) return {type: 'none'};
  const expected = Math.min(1, (t - start) / (end - start));
  const actual = 1 - opts.hpLeft / opts.hpMax;
  if (actual < expected - 0.25 && !opts.spec.dares.some(d => d.id === COMEBACK_ID)) {
    return {type: 'comeback_dare', dare: {id: COMEBACK_ID, text: 'Comeback side quest: everyone logs a move today for double team spirit.', bonus: 25, needsProof: false}};
  }
  if (actual > expected + 0.35 && !opts.alreadyBuffed) return {type: 'buff_boss', hpAdd: Math.round(opts.hpMax * 0.1)};
  return {type: 'none'};
}

// ---- Gear rules (§17.3) --------------------------------------------------------

export type GearSlug = 'cape' | 'rain-jacket' | 'headband' | 'shoes' | `trophy-${string}`;
export type GearAward = {slug: GearSlug; label: string; description: string};

/**
 * Deterministic: finishing a quest -> headband, then shoes, then a trophy badge per quest;
 * a 4-week streak -> cape; completing a rain dare -> rain jacket. Muse may only rename/describe these.
 */
export function gearForEvents(opts: {owned: string[]; questFinished?: {questId: number; bossName: string}; weeksStreak?: number; rainDare?: boolean}): GearAward[] {
  const out: GearAward[] = [];
  const has = (s: string) => opts.owned.includes(s) || out.some(g => g.slug === s);
  if (opts.questFinished) {
    const {questId, bossName} = opts.questFinished;
    if (!has('headband')) out.push({slug: 'headband', label: 'Squad headband', description: `Earned for taking down ${bossName}.`});
    else if (!has('shoes')) out.push({slug: 'shoes', label: 'Rally runners', description: `Earned for taking down ${bossName}.`});
    const trophy = `trophy-${questId}` as const;
    if (!has(trophy)) out.push({slug: trophy, label: `${bossName} trophy`, description: `The squad beat ${bossName}.`});
  }
  if ((opts.weeksStreak ?? 0) >= 4 && !has('cape')) out.push({slug: 'cape', label: 'Four-week cape', description: 'Four quests in a row. Wear it proudly.'});
  if (opts.rainDare && !has('rain-jacket')) out.push({slug: 'rain-jacket', label: 'Rain jacket', description: 'Trained in the rain and lived to tell.'});
  return out;
}

export const isRainDare = (text: string) => /\brain\b|\bdownpour\b|\bstorm\b/i.test(text);

// ---- Rewards (§18.1) ------------------------------------------------------------

export type RewardTier = GameSpec['rewards'][number]['tier'];

/** Gear always; discount for streak quests or hard bosses (hp >= 3000) or 2+ dares done; equipment only on big wins (hp >= 4000). */
export function unlockedTiers(opts: {template: GameSpec['template']; hpMax: number; daresDone: number}): RewardTier[] {
  const tiers: RewardTier[] = ['gear'];
  if (opts.template === 'streak' || opts.hpMax >= 3000 || opts.daresDone >= 2) tiers.push('discount');
  if (opts.hpMax >= 4000) tiers.push('equipment');
  return tiers;
}

/** Contribution table and MVP (ties -> lower user id, deterministic). */
export function contributions(moves: {userId: number; damage: number}[]) {
  const map = new Map<number, {damage: number; moves: number}>();
  for (const m of moves) {
    const c = map.get(m.userId) ?? {damage: 0, moves: 0};
    c.damage += m.damage;
    c.moves += 1;
    map.set(m.userId, c);
  }
  const total = [...map.values()].reduce((s, c) => s + c.damage, 0);
  let mvp: number | null = null;
  for (const [id, c] of map) if (mvp == null || c.damage > (map.get(mvp)?.damage ?? 0) || (c.damage === map.get(mvp)?.damage && id < mvp)) mvp = id;
  return {byUser: map, total, mvp};
}
