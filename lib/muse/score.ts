/**
 * Deterministic closeness XP (plan 5f): base XP per event type, scaled by the pair's tie strength. No model call.
 * Pure; the SQL that feeds tieStrength lives in closeness-queries.ts (pairTieStats). Tests: score.test.ts.
 */
import type {ScorableEvent} from '../xp-guard.ts';

export type ScoreResult = {
  xp: number;
  reason: string;
  warmthLabel: string;
};

/** Pair interactions as pairTieStats returns them: decay-weighted counts per direction, distinct channels. */
export type TieStats = {outWeight: number; inWeight: number; channels: number};

export const HALF_LIFE_DAYS = 14;
export const XP_MIN = 1;
export const XP_MAX = 25;

/** Max base 12 x max factor 2 = 24, inside XP_MAX. */
export const BASE_XP: Record<ScorableEvent, number> = {
  reaction: 3,
  comment: 6,
  message: 5,
  voice_note: 10,
  friend_accept: 12,
  quest: 12,
};

const LABELS: Record<ScorableEvent, string> = {
  reaction: 'Reaction',
  comment: 'Comment',
  message: 'Message',
  voice_note: 'Voice note',
  friend_accept: 'New friend',
  quest: 'Quest',
};

/** Weight of one interaction ageDays old (same formula as the SQL in pairTieStats). */
export function decay(ageDays: number): number {
  return Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE_DAYS);
}

/** 0..1: min/max of the two directions, 0 when nobody has interacted. */
export function reciprocity(outWeight: number, inWeight: number): number {
  const hi = Math.max(outWeight, inWeight);
  return hi > 0 ? Math.min(outWeight, inWeight) / hi : 0;
}

/** 0..1 blend of saturating volume (half-full at ~3 fresh interactions), reciprocity and channel diversity. */
export function tieStrength(s: TieStats): number {
  const volume = 1 - Math.exp(-(Math.max(0, s.outWeight) + Math.max(0, s.inWeight)) / 4);
  const diversity = Math.min(Math.max(s.channels - 1, 0), 3) / 3;
  return 0.5 * volume + 0.3 * reciprocity(s.outWeight, s.inWeight) + 0.2 * diversity;
}

function warmth(tie: number): string {
  if (tie >= 0.75) return 'Inseparable';
  if (tie >= 0.5) return 'Close';
  if (tie >= 0.2) return 'Warm';
  return 'New';
}

export function scoreXp(eventType: ScorableEvent, stats: TieStats): ScoreResult {
  const tie = tieStrength(stats);
  const factor = 1 + tie;
  const xp = Math.max(XP_MIN, Math.min(XP_MAX, Math.round(BASE_XP[eventType] * factor)));
  const warmthLabel = warmth(tie);
  return {xp, reason: `${LABELS[eventType]}: ${warmthLabel.toLowerCase()} tie, x${factor.toFixed(1)}`, warmthLabel};
}
