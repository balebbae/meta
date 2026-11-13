/**
 * Fitness level, decided by code (pure: no DB, no Muse). Muse is told the result, never asked to judge it, so the
 * level is the same every time, can't be talked up to game handicaps, and WHOOP values never reach a model: WHOOP
 * recovery only flips `easyWeek` here (docs/scheduler-coach.md §2.5).
 */
import type {EventKind} from '@/lib/activities/types';

export type Tier = 'new' | 'building' | 'regular' | 'strong';
export const TIER_RANK: Record<Tier, number> = {new: 0, building: 1, regular: 2, strong: 3};

type Ev = {kind: EventKind; startedAt: string; durationMin?: number; distanceKm?: number; steps?: number; raw?: unknown};
export type ActivityLevel = {kind: EventKind; tier: Tier; perWeek: number; kmPerWeek: number | null; longestKm: number | null; trend: 'up' | 'steady' | 'down'};
export type FitnessLevel = {
  tier: Tier;
  /** Weeks of history the level is based on (1-4). */
  weeks: number;
  perWeek: number;
  activeDaysPerWeek: number;
  activities: ActivityLevel[];
  stepsPerDay: number | null;
  sleepHours: number | null;
  /** Code-only reason to go easier this week. Muse only ever sees a yes/no. */
  easyWeek: 'recovery' | 'sleep' | 'spike' | null;
};

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const TRAINING = new Set<string>(['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'other']);
const r1 = (n: number) => Math.round(n * 10) / 10;
const at = (e: Ev) => new Date(e.startedAt).getTime();
const dayOf = (e: Ev) => new Date(e.startedAt).toDateString();

/** A workout that counts toward level. Short walks don't: WHOOP auto-logs every 15-minute stroll. */
export function isSession(e: {kind: string; durationMin?: number}): boolean {
  return TRAINING.has(e.kind) && !(e.kind === 'walk' && (e.durationMin ?? 30) < 30);
}

function tierFor(perWeek: number, kind?: EventKind, kmPerWeek?: number | null): Tier {
  let t: Tier = perWeek < 0.5 ? 'new' : perWeek < 1.5 ? 'building' : perWeek < 3 ? 'regular' : 'strong';
  // weekly distance says more than session count for runners and riders
  const km = kmPerWeek ?? 0;
  if ((kind === 'run' && km >= 30) || (kind === 'ride' && km >= 100)) t = 'strong';
  else if (((kind === 'run' && km >= 12) || (kind === 'ride' && km >= 40)) && TIER_RANK[t] < 2) t = 'regular';
  return t;
}

/** Level over the last 4 weeks (or since the first synced event, if that's sooner). */
export function fitnessLevel(events: Ev[], now = Date.now()): FitnessLevel {
  const recent = events.filter(e => at(e) >= now - 4 * WEEK && at(e) <= now + DAY);
  const weeks = recent.length ? Math.min(4, Math.max(1, (now - Math.min(...recent.map(at))) / WEEK)) : 1;
  const sessions = recent.filter(isSession);
  const activeDaysPerWeek = r1(new Set(sessions.map(dayOf)).size / weeks);

  const kinds = [...new Set(sessions.map(e => e.kind))];
  const activities = kinds
    .map((kind): ActivityLevel => {
      const mine = sessions.filter(e => e.kind === kind);
      const km = mine.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
      const perWeek = r1(mine.length / weeks);
      const kmPerWeek = km > 0 ? r1(km / weeks) : null;
      const last2 = mine.filter(e => at(e) >= now - 2 * WEEK).length;
      const prev2 = mine.length - last2;
      const trend = weeks < 3 ? 'steady' : last2 >= prev2 + 2 ? 'up' : last2 <= prev2 - 2 ? 'down' : 'steady';
      return {kind, tier: tierFor(perWeek, kind, kmPerWeek), perWeek, kmPerWeek, longestKm: km > 0 ? r1(Math.max(...mine.map(e => e.distanceKm ?? 0))) : null, trend};
    })
    .sort((a, b) => b.perWeek - a.perWeek)
    .slice(0, 3);

  const week = (kind: EventKind) => recent.filter(e => e.kind === kind && at(e) >= now - WEEK);
  const stepsByDay = new Map<string, number>();
  for (const e of week('steps')) stepsByDay.set(dayOf(e), Math.max(stepsByDay.get(dayOf(e)) ?? 0, e.steps ?? 0));
  const steps = [...stepsByDay.values()].filter(s => s > 0);
  const nights = week('sleep').filter(e => (e.durationMin ?? 0) > 0);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  const recovery = recent.filter(e => e.kind === 'recovery' && at(e) >= now - 1.5 * DAY).sort((a, b) => at(b) - at(a))[0];
  const score = Number((recovery?.raw as {recovery_score?: unknown} | undefined)?.recovery_score);
  const thisWeek = sessions.filter(e => at(e) >= now - WEEK).length;
  const before = sessions.length - thisWeek;
  const lastNights = nights.filter(e => at(e) >= now - 3 * DAY);
  const easyWeek: FitnessLevel['easyWeek'] =
    Number.isFinite(score) && score < 34 ? 'recovery' // WHOOP "red"
    : weeks >= 3 && thisWeek >= 4 && thisWeek > 1.5 * (before / (weeks - 1)) ? 'spike'
    : lastNights.length >= 2 && avg(lastNights.map(e => e.durationMin! / 60)) < 6 ? 'sleep'
    : null;

  return {
    tier: activeDaysPerWeek < 0.75 ? 'new' : activeDaysPerWeek < 2 ? 'building' : activeDaysPerWeek < 4 ? 'regular' : 'strong',
    weeks: Math.round(weeks),
    perWeek: r1(sessions.length / weeks),
    activeDaysPerWeek,
    activities,
    stepsPerDay: steps.length ? Math.round(avg(steps)) : null,
    sleepHours: nights.length ? r1(avg(nights.map(e => e.durationMin! / 60))) : null,
    easyWeek,
  };
}

const about = (n: number) => (n < 1 ? 'under 1' : `about ${Math.round(n)}`);

/** Rounded one-liner for the owner's own Muse (no exact numbers, no recovery/sleep values). */
export function describeLevel(l: FitnessLevel): string {
  if (!l.perWeek) return `new: no workouts synced in the last ${l.weeks === 1 ? 'week' : `${l.weeks} weeks`}`;
  const parts = l.activities.map(a => {
    const bits = [`${a.kind}: ${a.tier}, ${about(a.perWeek)} a week`];
    if (a.kmPerWeek) bits.push(`${about(a.kmPerWeek)} km a week`);
    if (a.longestKm) bits.push(`longest ${about(a.longestKm)} km`);
    if (a.trend !== 'steady') bits.push(`trending ${a.trend}`);
    return bits.join(', ');
  });
  return `${l.tier} overall (${about(l.activeDaysPerWeek)} active days a week over the last ${l.weeks === 1 ? 'week' : `${l.weeks} weeks`}). ${parts.join('. ')}`;
}

/** Tier from a level_4w answer (rounded "regular" or the exact description); null if withheld or a yes/no. */
export function tierOf(v: unknown): Tier | null {
  const m = typeof v === 'string' ? v.match(/^(new|building|regular|strong)\b/) : null;
  return m ? (m[1] as Tier) : null;
}
