/**
 * Coach mode math (pure: no DB, no Muse). This week (last 7 days) vs last week (the 7 before), improvements, gaps,
 * and the coaching rules (docs/scheduler-coach.md §2.4) that bound any plan to bridge them. The Muse gets the finished
 * numbers and writes the plan; it never does the math.
 */
import {isSession} from './level.ts'; // relative so the node test runner can load it
import type {EventKind} from '@/lib/activities/types';

type Ev = {kind: EventKind; startedAt: string; durationMin?: number; distanceKm?: number; steps?: number};
export type WeekStats = {sessions: number; minutes: number; activeDays: number; restDays: number; km: number; longestKm: number; byKind: Partial<Record<EventKind, number>>; stepsPerDay: number | null};
export type Delta = {metric: string; label: string; this: number; last: number; severity?: 'high' | 'medium'};
export type WeekCompare = {thisWeek: WeekStats; lastWeek: WeekStats; wins: Delta[]; gaps: Delta[]; rules: string[]; cap: {sessions: number; minutes: number}};

const DAY = 86_400_000;
const KIND_LABEL: Partial<Record<EventKind, string>> = {run: 'runs', walk: 'long walks', ride: 'rides', strength: 'strength sessions', yoga: 'yoga sessions', swim: 'swims', other: 'other workouts'};
const r1 = (n: number) => Math.round(n * 10) / 10;

export function weekStats(events: Ev[], from: number, to: number): WeekStats {
  const inWeek = events.filter(e => {
    const t = new Date(e.startedAt).getTime();
    return t >= from && t < to;
  });
  const sessions = inWeek.filter(isSession);
  const byKind: WeekStats['byKind'] = {};
  for (const e of sessions) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  const activeDays = new Set(sessions.map(e => new Date(e.startedAt).toDateString())).size;
  const stepsByDay = new Map<string, number>();
  for (const e of inWeek) if (e.kind === 'steps' && e.steps) stepsByDay.set(new Date(e.startedAt).toDateString(), e.steps);
  const steps = [...stepsByDay.values()];
  return {
    sessions: sessions.length,
    minutes: Math.round(sessions.reduce((s, e) => s + (e.durationMin ?? 0), 0)),
    activeDays,
    restDays: 7 - activeDays,
    km: r1(sessions.reduce((s, e) => s + (e.distanceKm ?? 0), 0)),
    longestKm: r1(Math.max(0, ...sessions.map(e => e.distanceKm ?? 0))),
    byKind,
    stepsPerDay: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null,
  };
}

/** A change is worth naming when it moves at least `min` and 10%. Drops of half or more are high severity. */
function delta(metric: string, label: string, now: number, before: number, min: number): {win?: Delta; gap?: Delta} {
  const d = now - before;
  if (Math.abs(d) < min || Math.abs(d) < 0.1 * Math.max(now, before)) return {};
  const row: Delta = {metric, label, this: now, last: before};
  if (d > 0) return {win: row};
  return {gap: {...row, severity: now <= before / 2 ? 'high' : 'medium'}};
}

export function compareWeeks(events: Ev[], opts: {now?: number; easyWeek?: boolean; tier?: string | null; goEasy?: string | null} = {}): WeekCompare {
  const now = opts.now ?? Date.now();
  const thisWeek = weekStats(events, now - 7 * DAY, now + DAY);
  const lastWeek = weekStats(events, now - 14 * DAY, now - 7 * DAY);
  const wins: Delta[] = [];
  const gaps: Delta[] = [];
  const add = (x: {win?: Delta; gap?: Delta}) => {
    if (x.win) wins.push(x.win);
    if (x.gap) gaps.push(x.gap);
  };
  add(delta('sessions', 'Workouts', thisWeek.sessions, lastWeek.sessions, 1));
  add(delta('minutes', 'Active minutes', thisWeek.minutes, lastWeek.minutes, 15));
  add(delta('active_days', 'Active days', thisWeek.activeDays, lastWeek.activeDays, 1));
  for (const k of Object.keys(KIND_LABEL) as EventKind[]) add(delta(`${k}_sessions`, KIND_LABEL[k]![0].toUpperCase() + KIND_LABEL[k]!.slice(1), thisWeek.byKind[k] ?? 0, lastWeek.byKind[k] ?? 0, 1));
  add(delta('km', 'Distance (km)', thisWeek.km, lastWeek.km, 1));
  add(delta('longest_km', 'Longest distance (km)', thisWeek.longestKm, lastWeek.longestKm, 0.5));
  if (thisWeek.stepsPerDay != null && lastWeek.stepsPerDay != null) add(delta('steps', 'Steps a day', thisWeek.stepsPerDay, lastWeek.stepsPerDay, 1000));
  // no rest at all is a gap even when every other number went up
  if (thisWeek.restDays === 0) gaps.unshift({metric: 'rest_days', label: 'Rest days', this: 0, last: lastWeek.restDays, severity: 'medium'});
  gaps.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));

  // §2.4: gradual increases only, never catch up a missed week in one go
  const base = Math.max(thisWeek.sessions, lastWeek.sessions);
  const cap = opts.easyWeek
    ? {sessions: Math.max(1, Math.min(base, thisWeek.sessions) - 1), minutes: Math.round(Math.min(thisWeek.minutes, lastWeek.minutes || thisWeek.minutes) * 0.7)}
    : {sessions: Math.max(2, Math.min(base + 1, thisWeek.sessions + 2)), minutes: Math.max(60, Math.round(Math.max(thisWeek.minutes, lastWeek.minutes) * 1.1))};
  const rules = [
    `Plan at most ${cap.sessions} workouts and about ${cap.minutes} active minutes over the next 7 days. Never make up a missed week in one go.`,
  ];
  if (thisWeek.restDays === 0) rules.push('They had no rest day: put a rest day in the plan before adding anything.');
  if (opts.tier === 'new' || thisWeek.sessions + lastWeek.sessions <= 1) rules.push('They are new or coming back: aim for consistency (2-3 short, easy sessions), not volume.');
  if (opts.easyWeek) rules.push('Easy week: fewer and lighter sessions, nothing hard, no races. Do not guess why.');
  if (opts.goEasy?.trim()) rules.push(`They asked to go easy on: "${opts.goEasy.trim().slice(0, 80)}". Pick activities that spare it.`);
  rules.push('No weight, body, calorie or appearance targets.');
  return {thisWeek, lastWeek, wins: wins.slice(0, 5), gaps: gaps.slice(0, 4), rules, cap};
}
