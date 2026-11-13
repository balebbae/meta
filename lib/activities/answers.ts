import {sql} from '@/lib/db';
import {getPolicies} from '@/lib/activities/policies';
import {listVaultEvents, type VaultEvent} from '@/lib/activities/vault';
import {QUESTION_CATEGORY, TRUST_RANK, type Answer, type Audience, type QuestionType, type ShareLevel, type Trust} from '@/lib/activities/types';

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

function bestTrust(events: VaultEvent[]): Trust | null {
  let best: Trust | null = null;
  for (const e of events) if (!best || TRUST_RANK[e.trust] > TRUST_RANK[best]) best = e.trust;
  return best;
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

const WORKOUT_KINDS = new Set(['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'other']);

function compute(question: QuestionType, events: VaultEvent[], level: ShareLevel): Answer['value'] {
  const weekStart = startOfWeek().getTime();
  const todayStart = startOfToday().getTime();
  const workouts = events.filter(e => WORKOUT_KINDS.has(e.kind));
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
    const events = visibleEvents(await listVaultEvents(ownerId, {since: new Date(Date.now() - 2 * WEEK_MS).toISOString(), limit: 300}), audience);
    answer = {question, value: compute(question, events, level), level, sourceTrust: bestTrust(events), withheld: false};
  }
  await sql`insert into answers_log (owner_id, asker, audience, question, answer, level)
    values (${ownerId}, ${asker}, ${audience}, ${question}, ${JSON.stringify(answer)}, ${level})`.catch(() => {});
  return answer;
}

/**
 * Muse-only context for the owner's own plan/handicap (§7.2 "Muse-only"): includes muse_only fields,
 * excludes 'none'. Only ever passed to a Muse call made on behalf of the owner; never shown to others.
 */
export async function museContext(ownerId: number): Promise<Record<string, Answer['value']>> {
  const policies = await getPolicies(ownerId);
  const events = await listVaultEvents(ownerId, {since: new Date(Date.now() - 2 * WEEK_MS).toISOString(), limit: 300});
  const out: Record<string, Answer['value']> = {};
  for (const q of Object.keys(QUESTION_CATEGORY) as QuestionType[]) {
    const level = policies[QUESTION_CATEGORY[q]].only_me;
    if (level === 'none') continue;
    out[q] = compute(q, events.filter(e => e.displayScope !== 'owner_only'), 'rounded');
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
