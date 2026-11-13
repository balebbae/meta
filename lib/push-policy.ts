/**
 * Per-recipient push policy (plan 5f): collapse bursts on one tag and keep quiet hours. Pure. Tests: push-policy.test.ts.
 */
export const COLLAPSE_MS = 2 * 60_000;
export const QUIET_FROM = 22;
export const QUIET_TO = 7;

export type PushDecision =
  | {send: false}
  | {send: true; urgency: 'high' | 'low'; silent: boolean; renotify: boolean};

/**
 * lastSentAt: when this recipient last got this tag (ms), hour: recipient's local hour (0-23), or null when unknown
 * (no quiet hours: server time is UTC on Vercel, which would silence US evenings).
 * Quiet hours drop everything but chat messages (tag conv-*), which still arrive silently at low urgency.
 * Within COLLAPSE_MS of the last push on the tag the notification replaces the old one without buzzing again.
 */
export function pushDecision(tag: string, lastSentAt: number | undefined, now: number, hour: number | null): PushDecision {
  const quiet = hour != null && (hour >= QUIET_FROM || hour < QUIET_TO);
  if (quiet && !tag.startsWith('conv-')) return {send: false};
  const collapse = lastSentAt != null && now - lastSentAt < COLLAPSE_MS;
  return {send: true, urgency: quiet ? 'low' : 'high', silent: quiet, renotify: !quiet && !collapse};
}
