/**
 * Goal roadmap math (pure: no DB, no Muse). Event facts (HYROX stations, race distances) come from the
 * fixed library below, never from the model. Muse proposes phases and milestones; normalizePlan()
 * makes them contiguous, in range and tied to real components. Unit tests: goal-plan.test.ts.
 */

export type EventKind = 'hyrox' | '5k' | '10k' | 'half_marathon' | 'marathon' | 'custom';
export type GoalComponent = {id: string; name: string; detail: string};
export type GoalPhase = {id: string; name: string; startWeek: number; endWeek: number; focus: string};
export type GoalMilestone = {id: string; title: string; week: number; phaseId: string; componentId: string | null; done: boolean; doneAt: string | null};
export type GoalPlan = {summary: string; weeks: number; components: GoalComponent[]; phases: GoalPhase[]; milestones: GoalMilestone[]};
export type Checkin = {status: 'ahead' | 'on_track' | 'behind'; headline: string; adjustments: string[]; at: string; museUsed: boolean};

type EventDef = {kind: EventKind; name: string; match: RegExp; defaultWeeks: number; keywords: string[]; tags: string[]; components: GoalComponent[]};

const run = (detail: string): GoalComponent => ({id: 'run', name: 'Running', detail});
const RUN_EVENT = (kind: EventKind, name: string, match: RegExp, weeks: number, distance: string, keywords: string[]): EventDef => ({
  kind,
  name,
  match,
  defaultWeeks: weeks,
  keywords: [...keywords, 'run', 'running'],
  tags: ['Running'],
  components: [run(`${distance} on race day`), {id: 'long-run', name: 'Long run', detail: 'One longer run each week'}, {id: 'speed', name: 'Speed', detail: 'Intervals or tempo once a week'}, {id: 'strength', name: 'Strength', detail: 'Two short sessions a week for legs and core'}],
});

/** Order matters: "half marathon" must match before "marathon". */
export const EVENTS: EventDef[] = [
  {
    kind: 'hyrox',
    name: 'HYROX',
    match: /hyrox/i,
    defaultWeeks: 12,
    keywords: ['hyrox', 'functional', 'crossfit', 'hiit'],
    tags: ['HIIT', 'Running', 'Lifting'],
    components: [
      run('8 × 1 km, one before each station'),
      {id: 'skierg', name: 'SkiErg', detail: '1,000 m'},
      {id: 'sled-push', name: 'Sled push', detail: '50 m'},
      {id: 'sled-pull', name: 'Sled pull', detail: '50 m'},
      {id: 'burpee-broad-jumps', name: 'Burpee broad jumps', detail: '80 m'},
      {id: 'row', name: 'Rowing', detail: '1,000 m'},
      {id: 'farmers-carry', name: 'Farmers carry', detail: '200 m'},
      {id: 'sandbag-lunges', name: 'Sandbag lunges', detail: '100 m'},
      {id: 'wall-balls', name: 'Wall balls', detail: '100 reps'},
    ],
  },
  RUN_EVENT('half_marathon', 'Half marathon', /half[\s-]?marathon|\bhalf\b|21\s?k/i, 12, '21.1 km', ['half marathon']),
  RUN_EVENT('marathon', 'Marathon', /marathon|42\s?k/i, 18, '42.2 km', ['marathon']),
  RUN_EVENT('10k', '10K', /\b10\s?k\b|10\s?km/i, 8, '10 km', ['10k']),
  RUN_EVENT('5k', '5K', /\b5\s?k\b|5\s?km|parkrun|couch to/i, 6, '5 km', ['5k', 'parkrun']),
];

export function matchEvent(text: string): EventDef | null {
  return EVENTS.find(e => e.match.test(text)) ?? null;
}

export const MIN_WEEKS = 4;
export const MAX_WEEKS = 30;
const DAY = 86_400_000;

/** Weeks until a YYYY-MM-DD date (null when missing, unparseable or in the past). */
export function weeksUntil(date: string | null | undefined, now = new Date()): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = new Date(`${date}T12:00:00Z`).getTime();
  if (!Number.isFinite(t) || t <= now.getTime()) return null;
  return Math.ceil((t - now.getTime()) / (7 * DAY));
}

export function addWeeks(now: Date, weeks: number): string {
  return new Date(now.getTime() + weeks * 7 * DAY).toISOString().slice(0, 10);
}

const clampInt = (n: unknown, lo: number, hi: number, dflt: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
};

export type RawPlan = {
  summary?: string;
  phases?: {name?: string; startWeek?: number; endWeek?: number; focus?: string}[];
  milestones?: {title?: string; week?: number; componentId?: string | null}[];
};

/** Makes a proposed plan safe to render: phases cover weeks 1..weeks with no gaps, milestones sit inside, ids are stable. */
export function normalizePlan(raw: RawPlan, weeks: number, components: GoalComponent[], fallback: GoalPlan): GoalPlan {
  const compIds = new Set(components.map(c => c.id));
  const proposed = (raw.phases ?? []).filter(p => p?.name).slice(0, 5);
  let phases: GoalPhase[] = fallback.phases;
  if (proposed.length >= 2) {
    const sorted = [...proposed].sort((a, b) => Number(a.startWeek ?? 0) - Number(b.startWeek ?? 0));
    let start = 1;
    phases = sorted.map((p, i) => {
      const last = i === sorted.length - 1;
      const remaining = sorted.length - i - 1;
      const end = last ? weeks : clampInt(p.endWeek, start, weeks - remaining, start);
      const phase = {id: `p${i + 1}`, name: String(p.name).slice(0, 30), startWeek: start, endWeek: end, focus: String(p.focus ?? '').slice(0, 140)};
      start = end + 1;
      return phase;
    });
  }
  const phaseFor = (w: number) => phases.find(p => w >= p.startWeek && w <= p.endWeek) ?? phases[phases.length - 1];
  const seen = new Set<string>();
  const ms = (raw.milestones ?? [])
    .filter(m => m?.title)
    .map(m => ({title: String(m.title).slice(0, 80), week: clampInt(m.week, 1, weeks, weeks), componentId: m.componentId && compIds.has(m.componentId) ? m.componentId : null}))
    .filter(m => (seen.has(m.title.toLowerCase()) ? false : (seen.add(m.title.toLowerCase()), true)))
    .sort((a, b) => a.week - b.week)
    .slice(0, 10);
  const milestones: GoalMilestone[] = (ms.length >= 3 ? ms : fallback.milestones).map((m, i) => ({id: `m${i + 1}`, title: m.title, week: m.week, phaseId: phaseFor(m.week).id, componentId: m.componentId, done: false, doneAt: null}));
  return {summary: String(raw.summary ?? '').slice(0, 240) || fallback.summary, weeks, components, phases, milestones};
}

/** Deterministic plan used offline and as the safety net for normalizePlan. */
export function fallbackPlan(event: EventDef | null, title: string, weeks: number): GoalPlan {
  const isRace = event != null;
  const cut = (f: number) => Math.max(1, Math.round(weeks * f));
  const spans: [string, number, number, string][] = isRace
    ? [
        ['Base', 1, cut(0.35), 'Show up 3 times a week and learn every movement at an easy effort.'],
        ['Build', cut(0.35) + 1, cut(0.7), 'Add volume and practise the hardest parts under some fatigue.'],
        ['Peak', cut(0.7) + 1, Math.max(cut(0.7) + 1, weeks - 1), 'Race-like sessions and one full rehearsal.'],
        ['Taper', weeks, weeks, 'Less volume, stay sharp, rest well before race day.'],
      ]
    : [
        ['Start', 1, cut(0.3), 'Make it a habit: same days every week.'],
        ['Build', cut(0.3) + 1, cut(0.75), 'A little more each week, one harder session.'],
        ['Lock it in', cut(0.75) + 1, weeks, 'Hit the goal and keep the routine.'],
      ];
  // Sequential pass so short plans (4-5 weeks) never get overlapping or empty phases.
  const phases: GoalPhase[] = [];
  let nextStart = 1;
  for (const [name, , e, focus] of spans) {
    const end = Math.min(weeks, e);
    if (end < nextStart) continue;
    phases.push({id: `p${phases.length + 1}`, name, startWeek: nextStart, endWeek: end, focus});
    nextStart = end + 1;
  }
  phases[phases.length - 1].endWeek = weeks;
  const at = (f: number) => Math.min(weeks, Math.max(1, Math.round(weeks * f)));
  const plan: [string, number, string | null][] =
    event?.kind === 'hyrox'
      ? [
          ['Three sessions in one week', at(0.1), null],
          ['4 × 1 km runs with short rests', at(0.25), 'run'],
          ['SkiErg 1,000 m without stopping', at(0.35), 'skierg'],
          ['Sled push and pull practice', at(0.45), 'sled-push'],
          ['100 wall balls, any number of sets', at(0.55), 'wall-balls'],
          ['Half simulation: 4 runs + 4 stations', at(0.7), null],
          ['Full race simulation', at(0.85), null],
          ['Race day', weeks, null],
        ]
      : isRace
        ? [
            ['Run 3 times in one week', at(0.12), 'run'],
            ['First week with a speed session', at(0.3), 'speed'],
            ['Long run at 50% of race distance', at(0.45), 'long-run'],
            ['Long run at 75% of race distance', at(0.65), 'long-run'],
            ['Dress rehearsal at race pace', at(0.85), 'run'],
            ['Race day', weeks, null],
          ]
        : [
            ['Two weeks in a row, same days', at(0.2), null],
            ['Try the goal at half size', at(0.45), null],
            ['Four good weeks in a row', at(0.7), null],
            [title.slice(0, 80), weeks, null],
          ];
  const phaseFor = (w: number) => phases.find(p => w >= p.startWeek && w <= p.endWeek) ?? phases[phases.length - 1];
  return {
    summary: isRace ? `${weeks} weeks from today to ${event.name}, built in ${phases.length} phases.` : `${weeks} weeks to ${title.toLowerCase()}, one step at a time.`,
    weeks,
    components: event?.components ?? [],
    phases,
    milestones: plan.map(([t, w, c], i) => ({id: `m${i + 1}`, title: t, week: w, phaseId: phaseFor(w).id, componentId: c, done: false, doneAt: null})),
  };
}

export function currentWeek(createdAt: string, weeks: number, now = new Date()): number {
  return Math.min(weeks, Math.max(1, Math.floor((now.getTime() - new Date(createdAt).getTime()) / (7 * DAY)) + 1));
}

export function progressOf(plan: GoalPlan): {done: number; total: number; pct: number} {
  const total = plan.milestones.length;
  const done = plan.milestones.filter(m => m.done).length;
  return {done, total, pct: total ? Math.round((done / total) * 100) : 0};
}

export type ComponentStatus = 'ready' | 'training' | 'later';

/** Ready = every milestone for it is done; training = one is due by this week; later = nothing due yet. */
export function componentStatus(plan: GoalPlan, componentId: string, week: number): ComponentStatus {
  const ms = plan.milestones.filter(m => m.componentId === componentId);
  if (ms.length && ms.every(m => m.done)) return 'ready';
  if (ms.some(m => !m.done && m.week <= week + 1)) return 'training';
  const phase = plan.phases.find(p => week >= p.startWeek && week <= p.endWeek);
  return phase && phase.id !== 'p1' ? 'training' : 'later';
}

/** Offline check-in: milestones due before this week that aren't done decide the status. */
export function fallbackCheckin(plan: GoalPlan, week: number, now = new Date()): Checkin {
  const overdue = plan.milestones.filter(m => !m.done && m.week < week);
  const early = plan.milestones.filter(m => m.done && m.week > week);
  const next = plan.milestones.find(m => !m.done);
  const {done, total} = progressOf(plan);
  if (overdue.length)
    return {
      status: 'behind',
      headline: `Behind by ${overdue.length} milestone${overdue.length === 1 ? '' : 's'}: "${overdue[0].title}" was due in week ${overdue[0].week}.`,
      adjustments: [`Make "${overdue[0].title}" this week's main session.`, 'Keep the other sessions short so you recover.', next && next !== overdue[0] ? `Then aim for "${next.title}".` : 'Check in again next week.'],
      at: now.toISOString(),
      museUsed: false,
    };
  return {
    status: early.length ? 'ahead' : 'on_track',
    headline: early.length ? `Ahead of plan: ${done} of ${total} milestones done.` : `On track: ${done} of ${total} milestones done.`,
    adjustments: [next ? `Next up: "${next.title}" (week ${next.week}).` : 'Every milestone is done.', 'Keep one rest day between hard sessions.'],
    at: now.toISOString(),
    museUsed: false,
  };
}
