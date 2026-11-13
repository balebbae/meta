/**
 * Closeness XP anti-farming (plan 5b). Pure; the DB lookup lives in closeness-queries.ts. Tests: xp-guard.test.ts.
 * One award per (actor, friend, source type, source id) ever, and at most DAILY_XP_CAP awards per source type per day.
 */
export const DAILY_XP_CAP: Record<string, number> = {reaction: 20, comment: 20, message: 20, voice_note: 10, friend_accept: 10, quest: 5};
const DEFAULT_CAP = 10;

/** Event types a client may ask /api/muse/score to score, with the server's own description (never client text). */
export const SCORABLE_EVENTS = {
  reaction: 'Reacted to a friend\'s post',
  comment: 'Commented on a friend\'s post',
  voice_note: 'Sent a friend a voice note',
  friend_accept: 'Accepted a friend request',
  message: 'Messaged a friend',
  quest: 'Completed a quest with a friend',
} as const;
export type ScorableEvent = keyof typeof SCORABLE_EVENTS;

export function isScorableEvent(v: unknown): v is ScorableEvent {
  return typeof v === 'string' && Object.hasOwn(SCORABLE_EVENTS, v);
}

/** null when XP may be awarded, else the reason it may not. */
export function xpBlockReason(state: {alreadyAwarded: boolean; todayCount: number}, sourceType: string): string | null {
  if (state.alreadyAwarded) return 'already awarded';
  if (state.todayCount >= (DAILY_XP_CAP[sourceType] ?? DEFAULT_CAP)) return 'daily cap reached';
  return null;
}
