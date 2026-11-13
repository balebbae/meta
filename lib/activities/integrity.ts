/**
 * Integrity rules (plan 5b): plausibility bounds and a 0..1 risk score per vault event. Pure, no DB.
 * Flags never block a save; a flagged event is downgraded to trust 'self_reported'. Tests: integrity.test.ts.
 */
import {TRUST_RANK, type EventKind, type QuestionType, type RawEvent, type Trust} from './types.ts';

type Bounds = {maxKmh?: number; maxKm?: number; maxMin?: number};
/** Upper bounds per kind: speeds above elite/record pace, distances above an ultra, durations above a day. */
export const BOUNDS: Partial<Record<EventKind, Bounds>> = {
  run: {maxKmh: 25, maxKm: 160, maxMin: 1440},
  walk: {maxKmh: 9, maxKm: 80, maxMin: 1440},
  ride: {maxKmh: 70, maxKm: 400, maxMin: 1440},
  swim: {maxKmh: 7, maxKm: 30, maxMin: 720},
  strength: {maxMin: 300},
  yoga: {maxMin: 300},
  other: {maxMin: 1440},
};
/** Steps per minute above a sprint cadence, and steps in one entry above any plausible day. */
export const MAX_CADENCE = 240;
export const MAX_STEPS = 100_000;
const FLAG_PENALTY = 0.35;

export type Integrity = {score: number; flags: string[]};

const LABEL: Partial<Record<EventKind, string>> = {run: 'a run', walk: 'a walk', ride: 'a ride', swim: 'a swim', strength: 'a strength session', yoga: 'a yoga session', other: 'a workout'};

export function integrityScore(e: Pick<RawEvent, 'kind' | 'distanceKm' | 'durationMin' | 'steps' | 'startedAt'>, now = Date.now()): Integrity {
  const flags: string[] = [];
  const b = BOUNDS[e.kind] ?? {};
  const what = LABEL[e.kind] ?? e.kind;
  const km = e.distanceKm ?? 0;
  const min = e.durationMin ?? 0;
  if (b.maxKmh && km > 0 && min > 0) {
    const kmh = km / (min / 60);
    if (kmh > b.maxKmh) flags.push(`pace too fast for ${what} (${kmh.toFixed(1)} km/h)`);
  }
  if (b.maxKm && km > b.maxKm) flags.push(`distance too long for ${what} (${Math.round(km)} km)`);
  if (b.maxMin && min > b.maxMin) flags.push(`duration too long for ${what} (${Math.round(min / 60)} h)`);
  const steps = e.steps ?? 0;
  if (steps > MAX_STEPS) flags.push(`too many steps (${steps})`);
  if (steps > 0 && min > 0 && steps / min > MAX_CADENCE) flags.push(`too many steps for the time (${Math.round(steps / min)}/min)`);
  if (new Date(e.startedAt).getTime() > now + 3_600_000) flags.push('starts in the future');
  return {score: Math.max(0, Math.round((1 - FLAG_PENALTY * flags.length) * 100) / 100), flags};
}

/** Score an event before it is stored: flagged events drop to 'self_reported' and carry the reasons in raw.integrity. */
export function applyIntegrity(e: RawEvent, now = Date.now()): RawEvent & {flags: string[]} {
  const {score, flags} = integrityScore(e, now);
  if (!flags.length) return {...e, flags};
  const raw = e.raw && typeof e.raw === 'object' ? (e.raw as Record<string, unknown>) : {};
  return {...e, trust: 'self_reported', raw: {...raw, integrity: {score, flags, trust: e.trust}}, flags};
}

type TrustEvent = {kind: EventKind; startedAt: string; distanceKm?: number; trust: Trust};
const WORKOUTS = new Set<EventKind>(['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'other']);

/**
 * Trust behind an answer: the best trust among the events that actually satisfy the question, so an old
 * device workout cannot vouch for today's move. "today" questions only look at today's matching events.
 */
export function answerTrust(question: QuestionType, events: TrustEvent[], todayStart: number): Trust | null {
  const today = (e: TrustEvent) => new Date(e.startedAt).getTime() >= todayStart;
  const matching =
    question === 'completed_move_today' ? events.filter(e => WORKOUTS.has(e.kind) && today(e))
    : question === 'completed_run_3km_today' ? events.filter(e => e.kind === 'run' && (e.distanceKm ?? 0) >= 3 && today(e))
    : events;
  let best: Trust | null = null;
  for (const e of matching) if (!best || TRUST_RANK[e.trust] > TRUST_RANK[best]) best = e.trust;
  return best;
}
