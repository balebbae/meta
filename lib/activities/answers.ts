import {sql} from '@/lib/db';
import {describeLevel, fitnessLevel, isSession} from '@/lib/activities/level';
import {getPolicies} from '@/lib/activities/policies';
import {listVaultEvents, type VaultEvent} from '@/lib/activities/vault';
import {answerTrust} from '@/lib/activities/integrity';
import {weeklyLoads, workoutsPerWeek} from '@/lib/activities/ahead';
import {QUESTION_CATEGORY, type Answer, type Audience, type QuestionType, type ShareLevel} from '@/lib/activities/types';

/**
 * Answers API (§7.3): structural redaction. The owner's vault is filtered to the fields this audience
 * may see, at the allowed precision, BEFORE anything is computed or handed to a model. Games, Discover
 * and other Muses only ever call ask(); they never read vault_events.
 */

const WEEK_MS = 7 * 24 * 3_600_000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function roundKm(km: number): string {
  if (km < 1) return 'under 1 km';
  const r = Math.round(km);
  return `about ${r} km`;
}

function bandCount(n: number): string {
  if (n === 0) return '0';
  if (n <= 2) return '1-2';
  if (n <= 4) return '3-4';
  return '5+';
}

/** Filter events for an audience: owner_only data (Strava, WHOOP detail) never leaves only_me. */
function visibleEvents(events: VaultEvent[], audience: Audience): VaultEvent[] {
  if (audience === 'only_me') return events;
  // WHOOP avg_hr/strain are owner-only detail fields (§5.3) even when the workout itself is shareable.
  return events.filter(e => e.displayScope !== 'owner_only').map(e => (e.source === 'whoop' ? {...e, avgHr: undefined} : e));
}

const KIND_2W: Partial<Record<QuestionType, string>> = {runs_2w: 'run', rides_2w: 'ride', strength_2w: 'strength', yoga_2w: 'yoga'};

/** Weeks of vault each question reads; load_weekly_16w is the only long one. */
const windowWeeks = (q: QuestionType) => (q === 'load_weekly_16w' ? 16 : 4);

/** `all` = the question's window (windowWeeks); everything except the 4-week/16-week ones reads the last 2. */
function compute(question: QuestionType, all: VaultEvent[], level: ShareLevel): Answer['value'] {
  if (question === 'load_weekly_16w') {
    const loads = weeklyLoads(all.filter(isSession), 16);
    // rounded = nearest 100 MET-minutes a week (≈ 10 min of running), so one session can't be read back
    return level === 'exact' ? loads.join(',') : level === 'rounded' ? loads.map(x => Math.round(x / 100) * 100).join(',') : loads.some(x => x > 0);
  }
  if (question === 'workouts_per_week_4w') {
    const n = workoutsPerWeek(all.filter(isSession));
    return level === 'exact' ? n : level === 'rounded' ? bandCount(n > 0 ? Math.max(1, Math.round(n)) : 0) : n > 0;
  }
  if (question === 'level_4w' || question === 'steps_avg_7d' || question === 'sleep_avg_7d') {
    const l = fitnessLevel(all);
    if (question === 'level_4w') return level === 'exact' ? describeLevel(l) : level === 'rounded' ? l.tier : l.tier !== 'new';
    if (question === 'steps_avg_7d') return l.stepsPerDay == null ? null : level === 'exact' ? l.stepsPerDay : level === 'rounded' ? `about ${Math.round(l.stepsPerDay / 1000)}k` : l.stepsPerDay >= 5000;
    return l.sleepHours == null ? null : level === 'exact' ? l.sleepHours : level === 'rounded' ? `about ${Math.round(l.sleepHours)} h` : l.sleepHours >= 7;
  }
  const events = all.filter(e => new Date(e.startedAt).getTime() >= Date.now() - 2 * WEEK_MS);
  const weekStart = startOfWeek().getTime();
  const todayStart = startOfToday().getTime();
  const workouts = events.filter(isSession);
  const thisWeek = workouts.filter(e => new Date(e.startedAt).getTime() >= weekStart);
  const today = workouts.filter(e => new Date(e.startedAt).getTime() >= todayStart);
  // rolling window for "a few months ahead" matching, so Mondays don't read as zero
  const last7 = workouts.filter(e => new Date(e.startedAt).getTime() >= Date.now() - WEEK_MS);
  switch (question) {
    case 'workouts_this_week':
      return level === 'exact' ? thisWeek.length : level === 'rounded' ? bandCount(thisWeek.length) : thisWeek.length > 0;
    case 'active_days_this_week': {
      const days = new Set(thisWeek.map(e => new Date(e.startedAt).toDateString())).size;
      return level === 'exact' ? days : level === 'rounded' ? bandCount(days) : days > 0;
    }
    case 'distance_this_week_km': {
      const km = thisWeek.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
      return level === 'exact' ? Math.round(km * 100) / 100 : level === 'rounded' ? roundKm(km) : km > 0;
    }
    case 'runs_2w':
    case 'rides_2w':
    case 'strength_2w':
    case 'yoga_2w':
    case 'workouts_2w': {
      const kind = KIND_2W[question];
      const n = kind ? workouts.filter(e => e.kind === kind).length : workouts.length;
      return level === 'exact' ? n : level === 'rounded' ? bandCount(n) : n > 0;
    }
    case 'distance_last_7_days_km': {
      const km = last7.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
      return level === 'exact' ? Math.round(km * 100) / 100 : level === 'rounded' ? roundKm(km) : km > 0;
    }
    case 'active_days_last_7_days': {
      const days = new Set(last7.map(e => new Date(e.startedAt).toDateString())).size;
      return level === 'exact' ? days : level === 'rounded' ? bandCount(days) : days > 0;
    }
    case 'completed_move_today':
      return today.length > 0;
    case 'completed_run_3km_today':
      return today.some(e => e.kind === 'run' && (e.distanceKm ?? 0) >= 3);
    case 'last_workout': {
      const last = workouts[0];
      if (!last) return null;
      if (level === 'exact') return `${last.kind} ${last.distanceKm ? `${last.distanceKm} km` : ''} ${last.durationMin ? `${Math.round(last.durationMin)} min` : ''}`.trim();
      if (level === 'rounded') return `${last.kind}${last.distanceKm ? `, ${roundKm(last.distanceKm)}` : ''}`;
      return true;
    }
    case 'steps_today': {
      const steps = events.filter(e => e.kind === 'steps' && new Date(e.startedAt).getTime() >= todayStart).reduce((s, e) => s + (e.steps ?? 0), 0);
      return level === 'exact' ? steps : level === 'rounded' ? `about ${Math.round(steps / 1000)}k` : steps >= 5000;
    }
    case 'avg_hr_this_week': {
      const hrs = thisWeek.map(e => e.avgHr).filter((h): h is number => typeof h === 'number');
      if (!hrs.length) return null;
      const avg = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
      return level === 'exact' ? avg : level === 'rounded' ? `${Math.round(avg / 10) * 10}s` : true;
    }
    case 'sleep_last_night_hours': {
      const sleep = events.find(e => e.kind === 'sleep');
      if (!sleep?.durationMin) return null;
      const h = sleep.durationMin / 60;
      return level === 'exact' ? Math.round(h * 10) / 10 : level === 'rounded' ? `about ${Math.round(h)} h` : h >= 7;
    }
  }
}

/**
 * ask(ownerId, audience, question) -> Answer. `asker` is logged for the owner's audit view
 * ("Who asked my Muse what, and what it said"), e.g. 'turf:12', 'quest:4', 'mentor:7', 'discover'.
 */
export async function ask(ownerId: number, audience: Audience, question: QuestionType, asker: string): Promise<Answer> {
  const policies = await getPolicies(ownerId);
  const category = QUESTION_CATEGORY[question];
  const level = policies[category][audience];
  let answer: Answer;
  if (level === 'none' || (level === 'muse_only' && audience !== 'only_me')) {
    answer = {question, value: null, level, sourceTrust: null, withheld: true};
  } else {
    // shortcut: the 500-row cap can cut the oldest weeks of a 16-week read for heavy daily-sync users; page or filter kinds if that shows up
    const events = visibleEvents(await listVaultEvents(ownerId, {since: new Date(Date.now() - windowWeeks(question) * WEEK_MS).toISOString(), limit: 500}), audience);
    answer = {question, value: compute(question, events, level), level, sourceTrust: answerTrust(question, events, startOfToday().getTime()), withheld: false};
  }
  await sql`insert into answers_log (owner_id, asker, audience, question, answer, level)
    values (${ownerId}, ${asker}, ${audience}, ${question}, ${JSON.stringify(answer)}, ${level})`.catch(() => {});
  return answer;
}

const ASK_CACHE = new Map<string, {answer: Answer; at: number}>();
const ASK_TTL = 10 * 60 * 1000;
export type PendingAudit = {ownerId: number; asker: string; audience: Audience; answer: Answer};

/**
 * ask() with answers cached ~10 min per (owner, audience, question), so a new audience or question always computes
 * fresh. Hits are still audited: they're pushed onto `audit` for one batched insert (flushAudit) by the caller.
 * shortcut: in-process Map; on serverless every instance has its own and cold starts begin empty, and a policy change
 * made on another instance can take up to the TTL to apply here; move to a shared cache keyed by policy version if that matters.
 */
export async function askCached(ownerId: number, audience: Audience, question: QuestionType, asker: string, audit: PendingAudit[]): Promise<Answer> {
  const key = `${ownerId}:${audience}:${question}`;
  const hit = ASK_CACHE.get(key);
  if (hit && Date.now() - hit.at < ASK_TTL) {
    audit.push({ownerId, asker, audience, answer: hit.answer});
    return hit.answer;
  }
  const answer = await ask(ownerId, audience, question, asker);
  if (ASK_CACHE.size > 5000) for (const [k, v] of ASK_CACHE) if (Date.now() - v.at >= ASK_TTL) ASK_CACHE.delete(k);
  ASK_CACHE.set(key, {answer, at: Date.now()});
  return answer;
}

/** Drop an owner's cached answers (their share policy changed). */
export function clearAskCache(ownerId: number) {
  for (const k of ASK_CACHE.keys()) if (k.startsWith(`${ownerId}:`)) ASK_CACHE.delete(k);
}

export async function flushAudit(rows: PendingAudit[]): Promise<void> {
  if (!rows.length) return;
  await sql`insert into answers_log (owner_id, asker, audience, question, answer, level)
    select * from unnest(${rows.map(r => r.ownerId)}::int[], ${rows.map(r => r.asker)}::text[], ${rows.map(r => r.audience)}::text[],
                         ${rows.map(r => r.answer.question)}::text[], ${rows.map(r => JSON.stringify(r.answer))}::jsonb[], ${rows.map(r => r.answer.level)}::text[])`.catch(() => {});
}

/**
 * Muse-only context for the owner's own plan/handicap (§7.2 "Muse-only"): includes muse_only fields,
 * excludes 'none'. Only ever passed to a Muse call made on behalf of the owner; never shown to others.
 */
export async function museContext(ownerId: number): Promise<Record<string, Answer['value']>> {
  const policies = await getPolicies(ownerId);
  const all = await listVaultEvents(ownerId, {since: new Date(Date.now() - 4 * WEEK_MS).toISOString(), limit: 500});
  // same filter as any shared audience: no owner_only rows (Strava, WHOOP sleep/recovery) and no WHOOP heart rate
  const events = visibleEvents(all, 'game_participants');
  const out: Record<string, Answer['value']> = {};
  for (const q of Object.keys(QUESTION_CATEGORY) as QuestionType[]) {
    const level = policies[QUESTION_CATEGORY[q]].only_me;
    if (level === 'none' || q === 'load_weekly_16w') continue; // the context only holds 4 weeks
    out[q] = compute(q, events, 'rounded');
  }
  if (policies.workouts.only_me !== 'none') {
    out.level_detail = describeLevel(fitnessLevel(events));
    // decided in code from everything, WHOOP recovery included; the Muse only learns yes/no, never why.
    // Recovery and sleep reasons count only if the owner lets their Muse use heart / sleep data at all.
    const why = fitnessLevel(all).easyWeek;
    out.easy_week = why === 'spike' || (why === 'recovery' && policies.heart.only_me !== 'none') || (why === 'sleep' && policies.sleep.only_me !== 'none');
  }
  return out;
}

export type AuditRow = {id: number; asker: string; audience: Audience; question: string; answer: Answer | null; level: ShareLevel; createdAt: string};

export async function listAudit(ownerId: number, limit = 50): Promise<AuditRow[]> {
  const rows = await sql`select id, asker, audience, question, answer, level, created_at from answers_log where owner_id = ${ownerId} order by id desc limit ${limit}`;
  return rows.map(r => ({
    id: Number(r.id),
    asker: String(r.asker),
    audience: r.audience as Audience,
    question: String(r.question),
    answer: (r.answer as Answer | null) ?? null,
    level: r.level as ShareLevel,
    createdAt: String(r.created_at),
  }));
}
