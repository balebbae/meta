import {sql} from '@/lib/db';
import {localCandidates} from '@/lib/activities/actions';
import {museContext} from '@/lib/activities/answers';
import {compareWeeks, type WeekCompare} from '@/lib/activities/coach-math';
import {listGoals} from '@/lib/activities/goals';
import {tierOf} from '@/lib/activities/level';
import {getPolicies} from '@/lib/activities/policies';
import {getUserTags} from '@/lib/activities/discover';
import {listVaultEvents} from '@/lib/activities/vault';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {panelHref} from '@/lib/activities/panel-href';

/**
 * Coach mode (docs/scheduler-coach.md §2, without the calendar half): this week vs last week from the owner's vault,
 * computed in code (coach-math.ts), then the owner's Muse (Ember) writes a short plan to bridge the gaps inside the
 * code's limits. A plan that breaks the limits is replaced by the rule-based one. Owner-only: nothing here is shared.
 * shortcut: built when the page opens (at most once a day, or on Refresh); add a Sunday/Wednesday cron + push once the app has a cron.
 */

export type BridgeKind = 'session' | 'rest' | 'event' | 'ahead' | 'rally' | 'goal';
export type BridgeStep = {kind: BridgeKind; title: string; why: string; when: string; sessions: number; minutes: number; href: string | null};
export type CoachReport = WeekCompare & {day: string; headline: string; bridge: BridgeStep[]; easyWeek: boolean; level: string | null; goal: {id: number; title: string} | null; museUsed: boolean; generatedAt: string};
export type CoachState = {enabled: boolean; blocked: string | null; report: CoachReport | null};

const KINDS: BridgeKind[] = ['session', 'rest', 'event', 'ahead', 'rally', 'goal'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SCHEMA = {
  type: 'object',
  properties: {
    headline: {type: 'string'},
    bridge: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: {type: 'string', enum: KINDS},
          title: {type: 'string'},
          why: {type: 'string'},
          when: {type: 'string'},
          sessions: {type: 'integer'},
          minutes: {type: 'integer'},
          candidateId: {type: 'string'},
        },
        required: ['kind', 'title', 'why', 'when', 'sessions', 'minutes', 'candidateId'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'bridge'],
  additionalProperties: false,
};

async function blockedReason(userId: number): Promise<string | null> {
  const p = await getPolicies(userId);
  return p.workouts.only_me === 'none' ? 'Your Muse is set to not see your workouts, so it has nothing to compare. Change that under Privacy.' : null;
}

export async function getCoach(userId: number): Promise<CoachState> {
  const [[profile], blocked] = await Promise.all([sql`select coach_mode from activity_profiles where user_id = ${userId}`, blockedReason(userId)]);
  const enabled = Boolean(profile?.coach_mode);
  if (!enabled || blocked) return {enabled, blocked, report: null};
  const [row] = await sql`select report from coach_reports where user_id = ${userId} and day = current_date`;
  return {enabled, blocked, report: (row?.report as CoachReport | undefined) ?? (await buildReport(userId))};
}

export async function setCoachMode(userId: number, enabled: boolean, deleteHistory = false): Promise<void> {
  await sql`insert into activity_profiles (user_id, coach_mode) values (${userId}, ${enabled})
    on conflict (user_id) do update set coach_mode = excluded.coach_mode, updated_at = now()`;
  if (!enabled && deleteHistory) await sql`delete from coach_reports where user_id = ${userId}`;
}

/** Rule-based bridge (Muse offline, or its plan broke the limits). */
function fallbackBridge(c: WeekCompare, easy: boolean): BridgeStep[] {
  const steps: BridgeStep[] = [];
  const top = c.gaps.find(g => g.metric !== 'rest_days');
  if (c.gaps.some(g => g.metric === 'rest_days')) steps.push({kind: 'rest', title: 'Take one full rest day', why: 'You trained every day this week; rest is when it sticks.', when: 'Tomorrow', sessions: 0, minutes: 0, href: null});
  const n = Math.max(1, Math.min(easy ? 1 : 2, c.cap.sessions));
  const kindGap = c.gaps.find(g => g.metric.endsWith('_sessions'));
  if (kindGap) steps.push({kind: 'session', title: `One easy ${kindGap.label.toLowerCase().replace(/s$/, '').replace(/ sessions?$/, ' session')}`, why: `You did ${kindGap.this} this week, ${kindGap.last} last week.`, when: 'Midweek', sessions: 1, minutes: 30, href: null});
  else if (top || !c.thisWeek.sessions) steps.push({kind: 'session', title: `${n === 1 ? 'One' : 'Two'} easy 30-minute ${n === 1 ? 'session' : 'sessions'}`, why: top ? `${top.label}: ${top.this} this week vs ${top.last} last week.` : 'A small, steady start beats a big one.', when: n === 1 ? 'Midweek' : 'Two days apart', sessions: n, minutes: 30 * n, href: null});
  else steps.push({kind: 'session', title: 'Repeat this week', why: 'No gaps to close; keeping it steady is the win.', when: 'Same days as this week', sessions: Math.min(c.thisWeek.sessions, c.cap.sessions), minutes: Math.min(c.thisWeek.minutes, c.cap.minutes), href: null});
  steps.push({kind: 'ahead', title: 'Ask someone a few months ahead', why: 'Their Muse can tell you what got them past the same week.', when: 'Any time', sessions: 0, minutes: 0, href: panelHref({panel: 'mentors'})});
  return steps.slice(0, 3);
}

function headlineFor(c: WeekCompare): string {
  const {thisWeek: t, lastWeek: l} = c;
  return `${t.sessions} ${t.sessions === 1 ? 'workout' : 'workouts'} this week (was ${l.sessions})${c.wins.length ? `, ${c.wins[0].label.toLowerCase()} up` : ''}.`;
}

export async function buildReport(userId: number): Promise<CoachReport> {
  const since = new Date(Date.now() - 15 * 86_400_000).toISOString();
  const [rows, ctx, [profile], goals, tags] = await Promise.all([
    listVaultEvents(userId, {since, limit: 500}),
    museContext(userId),
    sql`select go_easy_note from activity_profiles where user_id = ${userId}`,
    listGoals(userId).catch(() => []),
    getUserTags(userId).catch(() => [] as string[]),
  ]);
  // same rows museContext uses: no owner_only data (Strava, WHOOP sleep/recovery) feeds the Muse's numbers
  const events = rows.filter(e => e.displayScope !== 'owner_only');
  const easyWeek = ctx.easy_week === true;
  const level = typeof ctx.level_detail === 'string' ? ctx.level_detail : null;
  const compare = compareWeeks(events, {easyWeek, tier: tierOf(ctx.level_4w), goEasy: (profile?.go_easy_note as string | null) ?? null});
  const active = goals.find(g => g.status === 'active') ?? null;
  const goal = active ? {id: active.id, title: active.title} : null;
  const usualDays = [...new Set(events.filter(e => e.kind !== 'steps' && e.kind !== 'sleep' && e.kind !== 'recovery').map(e => DAY_NAMES[new Date(e.startedAt).getDay()]))];

  let bridge = fallbackBridge(compare, easyWeek);
  let headline = headlineFor(compare);
  let museUsed = false;
  if (museConfigured()) {
    try {
      const picks = (await localCandidates(userId, tags)).filter(c => c.kind === 'event' && !easyWeek).slice(0, 4);
      const next = active?.plan.milestones.find(m => !m.done);
      const out = await museJson<{headline: string; bridge: (Omit<BridgeStep, 'href'> & {candidateId: string})[]}>({
        model: MODELS.ember,
        schemaName: 'coach_bridge',
        schema: SCHEMA,
        effort: 'low',
        input: `You are this person's private Muse in Coach mode on Facebook Activities. Code already compared this week (last 7 days) with last week (the 7 days before). Write the plan that bridges the gaps.
This week: ${JSON.stringify(compare.thisWeek)}
Last week: ${JSON.stringify(compare.lastWeek)}
Improvements: ${JSON.stringify(compare.wins)}
Gaps (worst first): ${JSON.stringify(compare.gaps)}
Their level (measured over 4 weeks): ${level ?? 'unknown'}. Days they usually train: ${usualDays.join(', ') || 'none yet'}. Tags: ${tags.join(', ') || 'none'}.
${active ? `Their goal: "${active.title}", week ${active.week} of ${active.plan.weeks}${next ? `, next milestone: "${next.title}" (week ${next.week})` : ''}.` : 'No goal set.'}
Rules you must follow:
${compare.rules.map(r => `- ${r}`).join('\n')}
In-app events you may suggest (kind "event", use its candidateId): ${JSON.stringify(picks.map(e => ({candidateId: e.candidateId, title: e.title, detail: e.detail})))}
Return:
- headline: one sentence to them ("you") naming the biggest improvement and the biggest gap (if any), max 22 words. Encouraging and honest, no guilt.
- bridge: 1-3 steps for the next 7 days, biggest gap first. With no gaps, the steps keep this week's gains and add one small next step toward their goal or the next level. kind is one of: session (a workout), rest, event (one of the in-app events), ahead (ask someone a few months ahead through their Muse, for a gap that advice would fix), rally (a co-op game with friends, for a consistency gap), goal (a step from their goal plan). title max 60 characters and concrete ("Two easy 30-min runs"). why: one line tying it to a number above, max 18 words. when: a day or time from the days they usually train, or "" if none. sessions and minutes: what the step adds (0 for rest/ahead). candidateId: the event's id for kind event, else "".
Never mention weight, bodies, calories or health conditions. Not medical advice.`,
      });
      const eventIds = new Map(picks.map(e => [e.candidateId, e.url]));
      const steps = (out.bridge ?? []).slice(0, 3).flatMap((s): BridgeStep[] => {
        if (!KINDS.includes(s.kind)) return [];
        if (s.kind === 'event' && !eventIds.has(s.candidateId)) return [];
        const href = s.kind === 'event' ? eventIds.get(s.candidateId)! : s.kind === 'ahead' ? panelHref({panel: 'mentors'}) : s.kind === 'rally' ? '/activities#games' : s.kind === 'goal' ? panelHref({panel: 'goals', goal: goal?.id}) : null;
        const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
        return [{kind: s.kind, title: clip(s.title, 70), why: clip(s.why, 140), when: clip(s.when, 40), sessions: Math.max(0, Math.round(Number(s.sessions) || 0)), minutes: Math.max(0, Math.round(Number(s.minutes) || 0)), href}];
      });
      // the code's limits win: a plan that adds more than the cap (or skips a required rest day) is not used
      const total = steps.reduce((a, s) => ({sessions: a.sessions + s.sessions, minutes: a.minutes + s.minutes}), {sessions: 0, minutes: 0});
      const needsRest = compare.gaps.some(g => g.metric === 'rest_days');
      if (steps.length && total.sessions <= compare.cap.sessions && total.minutes <= compare.cap.minutes && (!needsRest || steps.some(s => s.kind === 'rest'))) {
        bridge = steps;
        headline = String(out.headline ?? '').trim().slice(0, 200) || headline;
        museUsed = true;
      }
    } catch (err) {
      console.error('[coach] Ember plan failed, using rules', err instanceof Error ? err.message : err);
    }
  }

  const report: CoachReport = {...compare, day: new Date().toISOString().slice(0, 10), headline, bridge, easyWeek, level, goal, museUsed, generatedAt: new Date().toISOString()};
  await sql`insert into coach_reports (user_id, day, report) values (${userId}, current_date, ${JSON.stringify(report)}::jsonb)
    on conflict (user_id, day) do update set report = excluded.report, created_at = now()`;
  return report;
}
