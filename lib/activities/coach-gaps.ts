/**
 * Coach mode, goal side (pure: no DB, no Muse). The last four weeks against what the goal needs by its day: one gap
 * per training dimension, and for each gap the bridge, which is a safe weekly ramp and the one thing to do this week.
 * coach-math.ts answers "did this week slip against last week"; this answers "how far am I from ready, and how do I
 * get there". Ramps are capped: about 10% a week for distance, one more session every two weeks. Never weight,
 * bodies or calories.
 */
import {isSession} from './level.ts'; // relative so the node test runner can load it
import type {EventKind} from '@/lib/activities/types';

type Ev = {kind: EventKind; startedAt: string; durationMin?: number; distanceKm?: number};
export type GoalKind = 'hyrox' | '5k' | '10k' | 'half_marathon' | 'marathon' | 'custom';
export type GapId = 'active_days' | 'runs' | 'weekly_km' | 'long_run' | 'strength' | 'rest';
export type GapStatus = 'closed' | 'on_track' | 'tight' | 'behind';
export type GoalGap = {
  id: GapId; label: string; unit: string;
  /** The 4-week reality and what the goal needs by its day. */
  now: number; need: number;
  /** How much of the need is already there, 0-100. */
  pct: number;
  status: GapStatus;
  why: string;
  /** The one concrete thing to do this week. */
  next: string;
  /** Targets for the coming weeks at a safe rate (up to four). Empty when the gap is closed. */
  ramp: {week: number; target: number}[];
  /** Weeks to close at the safe rate; null when closed. */
  weeksToClose: number | null;
  /** Two sentences from the Muse on how to do `next`, when it is on. */
  note?: string;
};
export type GapReport = {measuredAgainst: string; weeksLeft: number | null; readiness: number; verdict: string; gaps: GoalGap[]; overdue: {title: string; week: number}[]};
export type GapGoal = {title: string; kind: GoalKind; weeksLeft: number | null; overdue?: {title: string; week: number}[]};

/** What each goal needs in a normal week shortly before its day. Round, widely used coaching targets, not a prescription. */
const NEEDS: Record<GoalKind, {days: number; runs: number; km: number; long: number; strength: number}> = {
  '5k': {days: 3, runs: 3, km: 15, long: 5, strength: 1},
  '10k': {days: 4, runs: 3, km: 25, long: 10, strength: 1},
  half_marathon: {days: 4, runs: 4, km: 40, long: 18, strength: 1},
  marathon: {days: 5, runs: 4, km: 55, long: 30, strength: 1},
  hyrox: {days: 4, runs: 3, km: 20, long: 8, strength: 3},
  custom: {days: 3, runs: 0, km: 0, long: 0, strength: 1},
};
const DAY = 86_400_000, DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const r1 = (n: number) => Math.round(n * 10) / 10, half = (n: number) => Math.round(n * 2) / 2;
const RANK: Record<GapStatus, number> = {behind: 0, tight: 1, on_track: 2, closed: 3};

/** Distance grows about 10% a week (at least `min`), never past the need. */
function distanceRamp(now: number, need: number, min: number, hold: boolean): number[] {
  const out: number[] = []; let v = now;
  for (let w = 0; w < 60 && v < need; w++) { if (!(hold && w === 0)) v = Math.min(need, half(Math.max(v + min, v * 1.1))); out.push(v); }
  return out;
}
/** Frequency grows by one session, then holds a week before the next one. */
function countRamp(now: number, need: number, hold: boolean): number[] {
  const out: number[] = []; let v = Math.floor(now + 0.25);
  for (let w = 0; w < 60 && v < need; w++) { if (w % 2 === (hold ? 1 : 0)) v += 1; out.push(Math.min(need, v)); }
  return out;
}

export function goalGaps(events: Ev[], opts: {now?: number; goal?: GapGoal | null; dayTarget?: number | null; easyWeek?: boolean} = {}): GapReport {
  const now = opts.now ?? Date.now(), goal = opts.goal ?? null, need = NEEDS[goal?.kind ?? 'custom'], hold = Boolean(opts.easyWeek);
  const recent = events.filter(e => { const t = new Date(e.startedAt).getTime(); return t >= now - 28 * DAY && t <= now + DAY; }).filter(isSession);
  const oldest = Math.min(now, ...recent.map(e => new Date(e.startedAt).getTime()));
  const weeks = Math.max(1, Math.min(4, Math.ceil((now - oldest) / (7 * DAY)))); // a newcomer is averaged over the weeks they have
  const runs = recent.filter(e => e.kind === 'run');
  const per = (n: number) => r1(n / weeks);
  const restThisWeek = 7 - new Set(recent.filter(e => new Date(e.startedAt).getTime() >= now - 7 * DAY).map(e => new Date(e.startedAt).toDateString())).size;
  // a day they have not trained on lately, for "add one on …"
  const used = new Set(recent.map(e => new Date(e.startedAt).getDay())), free = [2, 4, 6, 1, 3, 5, 0].find(d => !used.has(d));
  const weeksLeft = goal?.weeksLeft ?? null, horizon = weeksLeft ?? 8;

  const build = (id: GapId, label: string, unit: string, have: number, want: number, ramp: number[], why: string, step: (target: number) => string): GoalGap | null => {
    if (want <= 0) return null;
    const closed = have >= want * 0.95, toClose = closed ? null : ramp.length;
    const status: GapStatus = closed ? 'closed' : toClose! <= horizon * 0.6 ? 'on_track' : toClose! <= horizon ? 'tight' : 'behind';
    const first = ramp[0] ?? want;
    const next = closed ? `Hold it: you are at ${have} ${unit} and the goal needs ${want}.` : hold && first <= have ? `Easy week: stay at ${have} ${unit}. The climb to ${want} starts next week.` : step(first);
    return {id, label, unit, now: have, need: want, pct: Math.max(0, Math.min(100, Math.round((have / want) * 100))), status, why, next, ramp: closed ? [] : ramp.slice(0, 4).map((target, i) => ({week: i + 1, target})), weeksToClose: toClose};
  };
  const days = per(new Set(recent.map(e => new Date(e.startedAt).toDateString())).size), wantDays = Math.max(need.days, opts.dayTarget ?? 0);
  const runsPer = per(runs.length), km = per(runs.reduce((s, e) => s + (e.distanceKm ?? 0), 0)), long = r1(Math.max(0, ...runs.map(e => e.distanceKm ?? 0))), strength = per(recent.filter(e => e.kind === 'strength').length);
  const gaps = [
    build('active_days', 'Active days', 'days a week', days, wantDays, countRamp(days, wantDays, hold), 'Showing up on enough days is the first thing any goal needs.', t => `Move on ${t} days this week${free !== undefined ? `: add ${DAYS[free]}` : ''}. A 30-minute walk counts.`),
    build('runs', 'Runs', 'runs a week', runsPer, need.runs, countRamp(runsPer, need.runs, hold), 'Running often, even short, builds the legs faster than one big run.', t => `Run ${t} ${t === 1 ? 'time' : 'times'} this week${free !== undefined ? `: add a short easy one on ${DAYS[free]}` : ''}. Twenty minutes is enough.`),
    build('weekly_km', 'Weekly distance', 'km a week', km, need.km, distanceRamp(km, need.km, 2, hold), 'Weekly distance is the base everything else sits on.', t => `Run about ${t} km in total this week, up from ${km}. Add it to easy runs, not hard ones.`),
    build('long_run', 'Longest run', 'km', long, need.long, distanceRamp(long, need.long, 1, hold), 'The long run is what makes the distance feel possible on the day.', t => `Make your longest run ${t} km this week (your longest lately is ${long} km). Slow enough to talk.`),
    build('strength', 'Strength', 'sessions a week', strength, need.strength, countRamp(strength, need.strength, hold), goal?.kind === 'hyrox' ? 'HYROX is half strength stations: sleds, lunges, wall balls, carries.' : 'Strength keeps you sturdy as the training grows.', t => `Do ${t} strength ${t === 1 ? 'session' : 'sessions'} this week: ${goal?.kind === 'hyrox' ? 'lunges, wall balls and a farmer carry' : 'squats, lunges, push-ups and a plank'}, 20 minutes.`),
    recent.length ? build('rest', 'Rest days', 'rest days this week', restThisWeek, 1, restThisWeek >= 1 ? [] : [1], 'Rest is when training sticks. No rest day is a gap even when every number is up.', () => 'Take one full rest day before adding anything else.') : null,
  ].filter((g): g is GoalGap => g !== null).sort((a, b) => RANK[a.status] - RANK[b.status] || a.pct - b.pct);

  const open = gaps.filter(g => g.status !== 'closed'), behind = gaps.filter(g => g.status === 'behind'), scored = gaps.filter(g => g.id !== 'rest');
  const readiness = scored.length ? Math.round(scored.reduce((s, g) => s + g.pct, 0) / scored.length) : 0;
  const what = goal ? goal.title : 'a steady week';
  const verdict = !recent.length
    ? 'No workouts in the last four weeks yet, so every gap is wide open. Start with the first step below; the rest follows.'
    : !open.length
      ? `You are where ${what} needs you. Hold it and arrive fresh.`
      : behind.length
        ? `${behind.map(g => g.label).join(' and ')} cannot fully close in the ${horizon} weeks ${weeksLeft == null ? 'ahead' : 'left'} at a safe rate. Close what you can and do not rush it.`
        : `${open.length} ${open.length === 1 ? 'gap' : 'gaps'} to close, and ${weeksLeft == null ? 'a safe ramp closes them all' : `the ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weeks'} left are enough for all of them`}. Biggest first.`;
  return {measuredAgainst: goal ? `what ${goal.title} needs by its day` : 'a steady, well-rounded week', weeksLeft, readiness, verdict, gaps, overdue: goal?.overdue ?? []};
}
