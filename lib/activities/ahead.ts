/**
 * "A few months ahead": pure matching math + the code-side relay filter. No DB, no Muse, so it's testable.
 * Matching only ever sees Answers values (rounded strings like "about 15 km", "3-4"), never raw vault rows.
 */
import {metMinutes} from './ontology.ts'; // relative so the node test runner can load it

const WEEK_MS = 7 * 86_400_000;
const ONTOLOGY_ID: Record<string, string> = {run: 'run', walk: 'walk', ride: 'cycle', strength: 'strength', yoga: 'yoga', swim: 'swim', other: 'bodyweight'};
type LoadEvent = {kind: string; startedAt: string; durationMin?: number; distanceKm?: number};

/** Training load of one workout: ontology MET-minutes (duration × MET at its pace). Steps/sleep/recovery are 0. */
export function eventLoad(e: LoadEvent): number {
  const id = ONTOLOGY_ID[e.kind];
  if (!id || !e.durationMin) return 0;
  return metMinutes(id, e.durationMin, {speedMph: e.distanceKm ? e.distanceKm / 1.609344 / (e.durationMin / 60) : null});
}

/** Rolling 7-day MET-minute loads, oldest first; the last entry is the 7 days up to `now` (no Monday reset). */
export function weeklyLoads(events: LoadEvent[], weeks: number, now = Date.now()): number[] {
  const out: number[] = new Array(weeks).fill(0);
  for (const e of events) {
    const w = Math.floor((now - new Date(e.startedAt).getTime()) / WEEK_MS);
    if (w >= 0 && w < weeks) out[weeks - 1 - w] += eventLoad(e);
  }
  return out.map(Math.round);
}

/** Workouts a week averaged over the rolling last `weeks` weeks (Rally handicaps: Monday no longer reads 0). */
export function workoutsPerWeek(events: {startedAt: string}[], now = Date.now(), weeks = 4): number {
  return events.filter(e => {
    const t = new Date(e.startedAt).getTime();
    return t <= now && t > now - weeks * WEEK_MS;
  }).length / weeks;
}

/** 4-week EWMA (alpha = 2/(4+1)): the "chronic" load. */
export const EWMA_ALPHA = 0.4;
export function ewma(series: number[], alpha = EWMA_ALPHA): number {
  return series.length ? series.slice(1).reduce((s, x) => alpha * x + (1 - alpha) * s, series[0]) : 0;
}

/** Acute:chronic workload cap by 4-week tier: 1.3 ≈ +12%/week on a 4-week EWMA; fitter people get less headroom. */
const ACWR: Record<string, number> = {new: 1.3, building: 1.3, regular: 1.2, strong: 1.1};

/**
 * How much load can safely grow in `weeks`: every week trains at ACWR × chronic, and chronic follows the EWMA,
 * so it compounds by 1 + alpha·(ACWR − 1) a week (closed form of that loop).
 */
export function rampGrowth(weeks = 12, tier?: string | null): number {
  const acwr = ACWR[tier ?? ''] ?? 1.3;
  return weeks <= 0 ? 1 : acwr * (1 + EWMA_ALPHA * (acwr - 1)) ** (weeks - 1);
}

/** Parse a load_weekly_16w Answer ("300,400,…", oldest first). null when withheld/boolean. */
export function loadSeries(v: unknown): number[] | null {
  return typeof v === 'string' && /^\d+(,\d+)+$/.test(v) ? v.split(',').map(Number) : null;
}

export type TrajectoryFit = {lag: number; closeness: number; growth: number; target: number; fit: number};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Past-state match: my last 4 weekly loads vs theirs from `weeks` ago (normalised L2, 1 = identical), times how far
 * they progressed since relative to my safe ramp over the same span (capped at 1). null = not enough history.
 */
export function trajectoryFit(mine: number[], theirs: number[], weeks = 12, tier?: string | null): TrajectoryFit | null {
  const lag = Math.min(weeks, theirs.length - 4);
  if (mine.length < 4 || lag < 4) return null;
  const me = mine.slice(-4);
  const past = theirs.slice(-4 - lag, -lag);
  if (!mean(me) || !mean(past)) return null;
  const closeness = Math.max(0, 1 - Math.hypot(...me.map((x, i) => x - past[i])) / (Math.hypot(...me) + Math.hypot(...past)));
  const growth = mean(theirs.slice(-4)) / mean(past);
  const target = rampGrowth(lag, tier);
  const progress = growth <= 1 ? 0 : Math.min(1, Math.log(growth) / Math.log(target));
  const fit = closeness * progress;
  return fit >= 0.35 ? {lag, closeness, growth, target, fit} : null;
}

/** Weekly level over the last 7 days. null = unknown / withheld. */
export type Level = {km: number | null; days: number | null};
export type AheadFit = {metric: 'km' | 'days'; me: number; them: number; target: number; fit: number};

/** Answers value -> number: 12 | "about 12 km" | "under 1 km" | "3-4" | "5+" | "0". Booleans and null carry no level. */
export function levelValue(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  if (/under 1/.test(v)) return 0.5;
  const range = v.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const plus = v.match(/(\d+)\s*\+/);
  if (plus) return Number(plus[1]) + 0.5;
  const n = v.match(/\d+(\.\d+)?/);
  return n ? Number(n[0]) : null;
}

/** Where someone could safely be after `weeks` of gradual progress: volume on the ACWR ramp for their tier, +2 days. */
export function targetFor(me: Level, weeks = 12, tier?: string | null): {km: number; days: number} {
  const km = Math.round(Math.max(me.km ?? 0, 3) * rampGrowth(weeks, tier));
  const days = Math.min(6, Math.max(3, Math.round((me.days ?? 0) + 2)));
  return {km, days};
}

const closeness = (them: number, target: number) => 1 - Math.abs(them - target) / target;

/** Best metric on which `them` sits near my ramp target (and clearly ahead of me today), or null. */
export function aheadFit(me: Level, them: Level, weeks = 12, tier?: string | null): AheadFit | null {
  const t = targetFor(me, weeks, tier);
  const fits: AheadFit[] = [];
  const myKm = me.km ?? 0;
  const myDays = me.days ?? 0;
  if (them.km != null && them.km > myKm * 1.15 + 1) fits.push({metric: 'km', me: myKm, them: them.km, target: t.km, fit: closeness(them.km, t.km)});
  if (them.days != null && them.days >= myDays + 1) fits.push({metric: 'days', me: myDays, them: them.days, target: t.days, fit: closeness(them.days, t.days)});
  const best = fits.sort((a, b) => b.fit - a.fit)[0];
  return best && best.fit >= 0.35 ? best : null;
}

/**
 * Code-side relay filter, applied before AND after the Muse rewrites a message, so contact details never cross
 * even if the model is talked into it: emails, URLs, phone numbers and @handles.
 */
export const CONTACT: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[contact removed]'],
  [/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]'],
  [/\b[\w-]+\.(?:com|net|org|io|me|co|app|gg|ly)(?:\/\S*)?\b/gi, '[link removed]'],
  [/\+?\d[\d\s().-]{7,}\d/g, '[number removed]'],
  [/(^|[^\w.@])@[\w.]{2,}/g, '$1[handle removed]'],
];

export function scrubContact(text: string): string {
  return CONTACT.reduce((t, [re, sub]) => t.replace(re, sub), text).trim().slice(0, 600);
}
