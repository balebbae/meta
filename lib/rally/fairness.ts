/**
 * Per-activity handicap math (pure: no DB, no Muse). Inputs are banded Answers only ("0", "1-2", "3-4",
 * "5+", or withheld), so nothing here can see raw workouts. lib/rally/handicap.ts adds the Muse layer.
 * Unit tests: fairness.test.ts.
 */
import type {Answer, GameSpec, QuestionType} from '@/lib/activities/types';

export type Focus = 'run' | 'ride' | 'strength' | 'yoga' | 'general';
/** 0 = none lately, 1 = 1-2 sessions, 2 = 3-4, 3 = 5+ in the last 2 weeks. null = withheld or unknown. */
export type Band = 0 | 1 | 2 | 3;

export const FOCUS_QUESTION: Record<Focus, QuestionType> = {run: 'runs_2w', ride: 'rides_2w', strength: 'strength_2w', yoga: 'yoga_2w', general: 'workouts_2w'};
export const FOCUS_LABEL: Record<Focus, string> = {run: 'running', ride: 'riding', strength: 'strength work', yoga: 'yoga and mobility', general: 'working out'};

const FOCUS_MATCH: [Focus, RegExp][] = [
  ['run', /\brun|jog|sprint|mile|\bkm\b|5k|10k|treadmill|marathon/i],
  ['ride', /bike|cycl|\bride|spin/i],
  ['yoga', /yoga|stretch|mobility|pilates|\bflow\b/i],
  ['strength', /lift|squat|deadlift|press|push.?up|pull.?up|dumbbell|kettlebell|lunge|plank|\brow\b|curl|burpee|wall ?ball|sled|core|abs/i],
];

/** The activity a game is mostly about, from the Reel caption/exercises or the sentence. */
export function activityFocus(text: string): Focus {
  let best: Focus = 'general';
  let bestHits = 0;
  for (const [focus, re] of FOCUS_MATCH) {
    const hits = (text.match(new RegExp(re.source, 'gi')) ?? []).length;
    if (hits > bestHits) {
      best = focus;
      bestHits = hits;
    }
  }
  return best;
}

export function bandOf(a: Answer | null | undefined): Band | null {
  const v = !a || a.withheld ? null : a.value;
  if (typeof v === 'string') return v === '0' ? 0 : v === '1-2' ? 1 : v === '3-4' ? 2 : v === '5+' ? 3 : null;
  if (typeof v === 'number') return v === 0 ? 0 : v <= 2 ? 1 : v <= 4 ? 2 : 3;
  if (typeof v === 'boolean') return v ? 2 : 0;
  return null;
}

export const BAND_LABEL = ['none lately', '1-2 sessions', '3-4 sessions', '5+ sessions'] as const;

const TABLE: Record<Band, {targetScale: number; damageScale: number}> = {
  0: {targetScale: 0.6, damageScale: 1.5},
  1: {targetScale: 0.8, damageScale: 1.25},
  2: {targetScale: 1.0, damageScale: 1.0},
  3: {targetScale: 1.2, damageScale: 0.8},
};

/** The game's own activity counts most; overall activity fills in when that one is withheld. */
export function fallbackScales(focusBand: Band | null, generalBand: Band | null) {
  return TABLE[focusBand ?? generalBand ?? 2];
}

export function fallbackReason(focus: Focus, focusBand: Band | null): string {
  const what = FOCUS_LABEL[focus];
  if (focusBand == null) return `You haven't shared recent ${what}, so you start at the standard level.`;
  if (focusBand >= 3) return `You've done a lot of ${what} lately, so your target is a bit higher.`;
  if (focusBand <= 1) return `${what[0].toUpperCase()}${what.slice(1)} is newer for you lately, so each move hits harder.`;
  return `You're right in the middle of the group for ${what}, so you play at the standard level.`;
}

export type Readiness = {fit: 'good' | 'stretch'; note: string};

/**
 * Is this game a good match for the player right now, or a stretch? From the same banded answers as the handicap:
 * recent sessions of the game's activity, and the 4-week level. Null when nothing was shared: no light either way.
 */
export function readiness(focus: Focus, focusBand: Band | null, generalBand: Band | null, level: string | null): Readiness | null {
  const what = FOCUS_LABEL[focus];
  const band = focusBand ?? generalBand;
  if (band == null && level == null) return null;
  const steady = level === 'regular' || level === 'strong';
  if (level === 'new' && (band ?? 0) <= 1) return {fit: 'stretch', note: `This one is mostly ${what} and you're just getting going. Start with the easy levels and build up.`};
  if (band === 0 && !steady) return {fit: 'stretch', note: `This one is mostly ${what} and you haven't done much of that lately. Ease in: your target is already scaled down.`};
  if (focus !== 'general' && focusBand === 0) return {fit: 'stretch', note: `You've been active, but not with ${what} lately. Take the first level easy.`};
  return {fit: 'good', note: `Good match: this is mostly ${what}, and that fits your recent weeks.`};
}

export const HANDICAP_RANGE = {targetScale: [0.6, 1.4], damageScale: [0.7, 1.6]} as const;

const clampTo = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 1));

/** Bounds a proposed handicap. A harder target never also earns bonus damage (and the reverse). */
export function clampHandicap(h: {targetScale: number; damageScale: number}) {
  let targetScale = clampTo(h.targetScale, HANDICAP_RANGE.targetScale);
  let damageScale = clampTo(h.damageScale, HANDICAP_RANGE.damageScale);
  if (targetScale > 1 && damageScale > 1) damageScale = 1;
  if (targetScale < 1 && damageScale < 1) damageScale = 1;
  targetScale = Math.round(targetScale * 100) / 100;
  damageScale = Math.round(damageScale * 100) / 100;
  return {targetScale, damageScale};
}

const CAPACITY: Record<Band, number> = {0: 0.45, 1: 0.7, 2: 1, 3: 1.3};

/**
 * How close the game should be once handicaps apply: expected damage per player is roughly how much
 * they move (from their band) times their damage scale. Spread = strongest / weakest expected share.
 */
export function predictFairness(players: {band: Band | null; damageScale: number}[]): {label: 'close' | 'fairly even' | 'lopsided'; spread: number} {
  const shares = players.map(p => CAPACITY[p.band ?? 2] * p.damageScale);
  if (shares.length < 2) return {label: 'close', spread: 1};
  const spread = Math.round((Math.max(...shares) / Math.max(0.01, Math.min(...shares))) * 100) / 100;
  return {label: spread <= 1.35 ? 'close' : spread <= 1.75 ? 'fairly even' : 'lopsided', spread};
}

export type HandicapPlan = {
  focus: Focus;
  handicaps: GameSpec['handicaps'];
  /** userId -> private one-liner, shown only to that player. */
  reasons: Record<number, string>;
  /** userId -> good match or stretch, shown only to that player. Missing when they share nothing. */
  readiness: Record<number, Readiness>;
  fairness: {label: string; spread: number; summary: string};
  museUsed: boolean;
};
