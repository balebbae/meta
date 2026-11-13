import {sql} from '@/lib/db';
import {ask} from '@/lib/activities/answers';
import {isFitnessText} from '@/lib/activities/keywords';
import {distanceKm, locate, type LatLng} from '@/lib/activities/geo';
import type {QuestionType} from '@/lib/activities/types';

/** Top of Activities: today's numbers for the owner (vault answers, 'only_me' audience, audit-logged). */
export type HomeProgress = {stepsToday: number | null; stepGoal: number; activeDays: number | null; activeTarget: number; sleepHours: number | null; movedToday: boolean; distanceKm: number | null; workouts: number | null; avgHr: number | null};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
// shortcut: fixed daily step goal, make it a profile field when goals get a steps component
const STEP_GOAL = 8000;
const TARGET: Record<string, number> = {'0': 3, '1-2': 2, '3-4': 4, '5+': 5};

export async function homeProgress(userId: number): Promise<HomeProgress> {
  const q = (question: QuestionType) => ask(userId, 'only_me', question, 'activities:home').then(a => a.value).catch(() => null);
  const [steps, active, sleep, moved, km, workouts, hr, rows] = await Promise.all([q('steps_today'), q('active_days_this_week'), q('sleep_last_night_hours'), q('completed_move_today'), q('distance_this_week_km'), q('workouts_this_week'), q('avg_hr_this_week'), sql`select weekly_active_days from activity_profiles where user_id = ${userId}`.catch(() => [])]);
  const band = String(rows[0]?.weekly_active_days ?? '');
  return {stepsToday: num(steps), stepGoal: STEP_GOAL, activeDays: num(active), activeTarget: TARGET[band] ?? 3, sleepHours: num(sleep), movedToday: moved === true, distanceKm: num(km), workouts: num(workouts), avgHr: num(hr)};
}

export type NearbyEvent = {id: number; title: string; location: string; startsAt: string; coverUrl: string; pin: LatLng | null; distanceKm: number | null};
export type Nearby = {events: NearbyEvent[]; home: LatLng | null};

/** In-person events in the next 30 days, fitness ones first, pinned by place name; distance from the profile city. */
export async function nearbyEvents(userId: number): Promise<Nearby> {
  const [rows, [u]] = await Promise.all([
    sql`select id, title, location, cover_url, starts_at, settings from events where starts_at > now() and starts_at < now() + interval '30 days' and not is_online order by starts_at limit 40`,
    sql`select current_city from user_details where user_id = ${userId}`,
  ]);
  const home = locate(String(u?.current_city ?? ''));
  const fit = rows.filter(r => (r.settings as {fitness?: boolean} | null)?.fitness || isFitnessText(String(r.title)));
  const events = (fit.length ? fit : rows).slice(0, 8).map(r => {
    const pin = locate(String(r.location));
    return {id: Number(r.id), title: String(r.title), location: String(r.location), startsAt: new Date(r.starts_at as string).toISOString(), coverUrl: String(r.cover_url), pin, distanceKm: pin && home ? distanceKm(home, pin) : null};
  });
  return {events, home};
}
