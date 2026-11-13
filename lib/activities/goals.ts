/**
 * Goals: "I want to compete in a HYROX" -> a roadmap, people on the same path, and a solo Muse game.
 * Muse Spark plans phases/milestones and writes check-ins from the owner's own Muse context (their
 * rounded data, never shown to anyone). Event facts come from goal-plan.ts, numbers are normalized
 * there. Matching only reads tags people chose to show friends, public groups and events.
 */
import {sql} from '@/lib/db';
import {museContext} from '@/lib/activities/answers';
import {getUserTags} from '@/lib/activities/discover';
import {upsertTag} from '@/lib/activities/tags';
import {
  EVENTS,
  MAX_WEEKS,
  MIN_WEEKS,
  addWeeks,
  currentWeek,
  fallbackCheckin,
  fallbackPlan,
  matchEvent,
  normalizePlan,
  progressOf,
  weeksUntil,
  type Checkin,
  type EventKind,
  type GoalPlan,
  type RawPlan,
} from '@/lib/activities/goal-plan';
import {createGroup, isMember} from '@/lib/messaging-queries';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {createQuest, getQuest} from '@/lib/rally/queries';

export type Goal = {
  id: number;
  userId: number;
  rawText: string;
  title: string;
  eventKind: EventKind;
  eventDate: string | null;
  plan: GoalPlan;
  checkin: Checkin | null;
  conversationId: number | null;
  questId: number | null;
  status: 'active' | 'done' | 'archived';
  museUsed: boolean;
  createdAt: string;
  week: number;
  progress: {done: number; total: number; pct: number};
};

function mapGoal(r: Record<string, unknown>): Goal {
  const plan = r.plan as GoalPlan;
  const createdAt = new Date(r.created_at as string).toISOString();
  const d = r.event_date as string | Date | null;
  return {
    id: r.id as number,
    userId: r.user_id as number,
    rawText: r.raw_text as string,
    title: r.title as string,
    eventKind: r.event_kind as EventKind,
    eventDate: d ? (d instanceof Date ? d.toISOString() : new Date(d).toISOString()).slice(0, 10) : null,
    plan,
    checkin: (r.checkin as Checkin | null) ?? null,
    conversationId: (r.conversation_id as number | null) ?? null,
    questId: (r.quest_id as number | null) ?? null,
    status: r.status as Goal['status'],
    museUsed: Boolean(r.muse_used),
    createdAt,
    week: currentWeek(createdAt, plan.weeks),
    progress: progressOf(plan),
  };
}

export async function listGoals(userId: number): Promise<Goal[]> {
  const rows = await sql`select * from goals where user_id = ${userId} and status <> 'archived' order by status, created_at desc limit 10`;
  return rows.map(mapGoal);
}

/** Owner only: goals are private to the person who set them. */
export async function getGoal(id: number, userId: number): Promise<Goal | null> {
  const [r] = await sql`select * from goals where id = ${id} and user_id = ${userId}`;
  return r ? mapGoal(r) : null;
}

// ---- Create: Muse Spark plans the roadmap -------------------------------------------

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    title: {type: 'string'},
    eventDate: {type: 'string'},
    weeks: {type: 'integer'},
    summary: {type: 'string'},
    phases: {type: 'array', items: {type: 'object', properties: {name: {type: 'string'}, startWeek: {type: 'integer'}, endWeek: {type: 'integer'}, focus: {type: 'string'}}, required: ['name', 'startWeek', 'endWeek', 'focus'], additionalProperties: false}},
    milestones: {type: 'array', items: {type: 'object', properties: {title: {type: 'string'}, week: {type: 'integer'}, componentId: {type: 'string'}}, required: ['title', 'week', 'componentId'], additionalProperties: false}},
  },
  required: ['title', 'eventDate', 'weeks', 'summary', 'phases', 'milestones'],
  additionalProperties: false,
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function createGoal(userId: number, text: string, now = new Date()): Promise<Goal> {
  const raw = text.trim().slice(0, 300);
  const event = matchEvent(raw);
  const components = event?.components ?? [];
  let title = event ? `${event.name}` : titleCase(raw.replace(/^i (want|would like|'d like) to\s+/i, '').slice(0, 60));
  let weeks = event?.defaultWeeks ?? 8;
  let eventDate: string | null = null;
  let plan = fallbackPlan(event, title, weeks);
  let museUsed = false;

  if (museConfigured()) {
    try {
      const [ctx, tags] = await Promise.all([museContext(userId), getUserTags(userId)]);
      const out = await museJson<RawPlan & {title: string; eventDate: string; weeks: number}>({
        model: MODELS.spark,
        schemaName: 'goal_roadmap',
        schema: PLAN_SCHEMA,
        effort: 'low',
        input: `You are a careful training planner inside Facebook Activities. Today is ${now.toISOString().slice(0, 10)}.
The user's goal, in their words: "${raw}"
${event ? `This is a ${event.name}. Its parts (use these ids for componentId, or "" for none): ${JSON.stringify(components)}` : 'This is a custom goal. Use "" for every componentId.'}
Their recent activity (rounded, last 2 weeks): ${JSON.stringify(ctx)}. Their tags: ${tags.join(', ') || 'none'}.
Return:
- title: short name for the goal (max 40 characters).
- eventDate: YYYY-MM-DD if the user gave or clearly implied a date or month (pick a Saturday in that month), else "".
- weeks: weeks from today to the goal, ${MIN_WEEKS}-${MAX_WEEKS}. ${event ? `Default ${event.defaultWeeks} if no date.` : 'Default 8 if no date.'}
- summary: one sentence on how the plan works.
- phases: 3-4 phases covering week 1 to the last week with no gaps (for races: base, build, peak, then a 1-week taper). focus = one sentence.
- milestones: 6-9 concrete, checkable steps in order, each in a week, getting harder; the last one is the goal itself. Tie each to a componentId when it trains one part.
Start from where they are now, not where an athlete would be. Include easier weeks to recover.
If the goal is about body weight or looks, plan around habits and performance instead and never set weight targets.
Never give medical advice.`,
      });
      const fromDate = weeksUntil(out.eventDate, now);
      weeks = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, fromDate ?? (Number(out.weeks) || weeks)));
      eventDate = fromDate ? out.eventDate : null;
      if (out.title?.trim()) title = out.title.trim().slice(0, 60);
      plan = normalizePlan(out, weeks, components, fallbackPlan(event, title, weeks));
      museUsed = true;
    } catch (err) {
      console.error('[goals] Spark plan failed, using fallback', err instanceof Error ? err.message : err);
    }
  }
  eventDate ??= event ? addWeeks(now, weeks) : null;

  const [row] = await sql`
    insert into goals (user_id, raw_text, title, event_kind, event_date, plan, muse_used)
    values (${userId}, ${raw}, ${title}, ${event?.kind ?? 'custom'}, ${eventDate}, ${JSON.stringify(plan)}::jsonb, ${museUsed})
    returning *`;
  // The goal becomes a friends-visible tag so friends training for the same thing can find each other.
  await upsertTag(userId, {tag: event?.name ?? 'Train for an event', kind: 'goal', origin: 'selected'}).catch(() => {});
  return mapGoal(row);
}

export async function setMilestone(goal: Goal, milestoneId: string, done: boolean): Promise<Goal> {
  const plan: GoalPlan = {...goal.plan, milestones: goal.plan.milestones.map(m => (m.id === milestoneId ? {...m, done, doneAt: done ? new Date().toISOString() : null} : m))};
  const allDone = plan.milestones.every(m => m.done);
  const [row] = await sql`update goals set plan = ${JSON.stringify(plan)}::jsonb, status = ${allDone ? 'done' : 'active'}, updated_at = now() where id = ${goal.id} returning *`;
  return mapGoal(row);
}

export async function archiveGoal(goal: Goal): Promise<void> {
  await sql`update goals set status = 'archived', updated_at = now() where id = ${goal.id}`;
}

// ---- Weekly check-in ----------------------------------------------------------------

const CHECKIN_SCHEMA = {
  type: 'object',
  properties: {status: {type: 'string', enum: ['ahead', 'on_track', 'behind']}, headline: {type: 'string'}, adjustments: {type: 'array', items: {type: 'string'}}},
  required: ['status', 'headline', 'adjustments'],
  additionalProperties: false,
};

export async function checkIn(goal: Goal, now = new Date()): Promise<Goal> {
  let checkin = fallbackCheckin(goal.plan, goal.week, now);
  if (museConfigured()) {
    try {
      const ctx = await museContext(goal.userId);
      const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek);
      const out = await museJson<{status: Checkin['status']; headline: string; adjustments: string[]}>({
        model: MODELS.spark,
        schemaName: 'goal_checkin',
        schema: CHECKIN_SCHEMA,
        effort: 'low',
        input: `Weekly check-in for the goal "${goal.title}". It is week ${goal.week} of ${goal.plan.weeks}, phase "${phase?.name ?? ''}" (${phase?.focus ?? ''}).
Milestones: ${JSON.stringify(goal.plan.milestones.map(m => ({title: m.title, week: m.week, done: m.done})))}
Their last 2 weeks (rounded): ${JSON.stringify(ctx)}
The rule-based read is: ${checkin.status} ("${checkin.headline}"). Agree unless the activity clearly says otherwise.
Return status, a one-sentence headline to the user ("you"), and 2-3 specific adjustments for the next 7 days (each max 18 words).
Encouraging, honest, no guilt. If they are behind, shrink the plan instead of piling on. Never mention bodies, weight or health. Not medical advice.`,
      });
      checkin = {
        status: ['ahead', 'on_track', 'behind'].includes(out.status) ? out.status : checkin.status,
        headline: String(out.headline ?? '').slice(0, 200) || checkin.headline,
        adjustments: (out.adjustments ?? []).map(a => String(a).slice(0, 160)).filter(Boolean).slice(0, 3),
        at: now.toISOString(),
        museUsed: true,
      };
      if (!checkin.adjustments.length) checkin.adjustments = fallbackCheckin(goal.plan, goal.week, now).adjustments;
    } catch (err) {
      console.error('[goals] Spark check-in failed, using rules', err instanceof Error ? err.message : err);
    }
  }
  const [row] = await sql`update goals set checkin = ${JSON.stringify(checkin)}::jsonb, updated_at = now() where id = ${goal.id} returning *`;
  return mapGoal(row);
}

// ---- People on the same path --------------------------------------------------------

export type GoalMatches = {
  chats: {id: number; name: string; members: number; sharing: number}[];
  friends: {id: number; name: string; avatarUrl: string; tag: string}[];
  groups: {id: number; name: string; coverUrl: string; members: number}[];
  events: {id: number; title: string; startsAt: string; location: string; coverUrl: string}[];
};

export async function goalMatches(goal: Goal): Promise<GoalMatches> {
  const event = EVENTS.find(e => e.kind === goal.eventKind) ?? null;
  const tags = Array.from(new Set([...(event?.tags ?? []), event?.name ?? 'Train for an event']));
  const words = event?.keywords ?? goal.title.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
  const patterns = words.length ? words.map(w => `%${w}%`) : ['%fitness%'];
  const uid = goal.userId;
  const [chats, friends, groups, events] = await Promise.all([
    // Group chats you're in where others show a matching tag to friends (count only, no names).
    sql`
      select c.id, coalesce(c.name, 'Group chat') as name,
        (select count(*)::int from conversation_members x where x.conversation_id = c.id) as members,
        count(distinct t.user_id)::int as sharing
      from conversation_members me
      join conversations c on c.id = me.conversation_id and c.is_group
      join conversation_members cm on cm.conversation_id = c.id and cm.user_id <> ${uid}
      left join user_tags t on t.user_id = cm.user_id and t.visibility in ('public', 'friends') and t.tag = any(${tags}::text[])
      where me.user_id = ${uid} and c.id is distinct from ${goal.conversationId}
      group by c.id
      having count(distinct t.user_id) > 0 or lower(coalesce(c.name, '')) like any(${patterns}::text[])
      order by sharing desc, c.updated_at desc limit 4`,
    sql`
      select distinct on (u.id) u.id, u.name, u.avatar_url, t.tag
      from friendships f
      join users u on u.id = case when f.user_id = ${uid} then f.friend_id else f.user_id end
      join user_tags t on t.user_id = u.id and t.visibility in ('public', 'friends') and t.tag = any(${tags}::text[])
      where f.status = 'accepted' and (f.user_id = ${uid} or f.friend_id = ${uid})
      order by u.id, (t.tag = ${event?.name ?? ''}) desc limit 6`,
    sql`
      select g.id, g.name, g.cover_url, (select count(*)::int from group_members gm where gm.group_id = g.id) as members
      from groups g where g.privacy = 'public' and (lower(g.name) like any(${patterns}::text[]) or lower(coalesce(g.description, '')) like any(${patterns}::text[]))
      order by members desc limit 4`,
    sql`
      select id, title, starts_at, location, cover_url from events
      where starts_at > now() and (lower(title) like any(${patterns}::text[]) or lower(coalesce(description, '')) like any(${patterns}::text[]))
      order by starts_at limit 3`,
  ]);
  return {
    chats: chats.map(r => ({id: r.id as number, name: r.name as string, members: Number(r.members), sharing: Number(r.sharing)})),
    friends: friends.map(r => ({id: r.id as number, name: r.name as string, avatarUrl: r.avatar_url as string, tag: r.tag as string})),
    groups: groups.map(r => ({id: r.id as number, name: r.name as string, coverUrl: r.cover_url as string, members: Number(r.members)})),
    events: events.map(r => ({id: r.id as number, title: r.title as string, startsAt: new Date(r.starts_at as string).toISOString(), location: r.location as string, coverUrl: r.cover_url as string})),
  };
}

// ---- The goal's Muse game -----------------------------------------------------------

/** This week's slice of the roadmap as a sentence for the Rally Game Master. */
export function weekBrief(goal: Goal): string {
  const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0];
  const upcoming = goal.plan.milestones.filter(m => !m.done).slice(0, 2);
  const parts = upcoming.map(m => goal.plan.components.find(c => c.id === m.componentId)?.name).filter(Boolean);
  return `Week ${goal.week} of ${goal.plan.weeks} training for ${goal.title} (${phase.name} phase: ${phase.focus}). Next steps: ${upcoming.map(m => m.title).join('; ') || 'keep the routine'}.${parts.length ? ` Train: ${parts.join(', ')}.` : ''}`;
}

/**
 * Solo: a private one-person chat ("<goal> with Muse") hosts a weekly Rally quest built from the roadmap.
 * With conversationId: the same quest for a group chat you're in, so friends train the same week with you.
 */
export async function startGoalGame(goal: Goal, user: {id: number; name: string}, conversationId?: number): Promise<{questId: number; conversationId: number}> {
  let chatId = conversationId ?? goal.conversationId;
  if (conversationId != null && !(await isMember(conversationId, user.id))) throw new Error('not a member');
  if (!conversationId) {
    if (goal.questId) {
      const existing = await getQuest(goal.questId);
      if (existing && existing.status === 'active' && new Date(existing.endsAt) > new Date()) return {questId: existing.id, conversationId: existing.conversationId ?? chatId ?? 0};
    }
    if (!chatId) {
      chatId = await createGroup(user.id, [], `${goal.title} with Muse`, null);
      await sql`update goals set conversation_id = ${chatId} where id = ${goal.id}`;
    }
  }
  const {quest} = await createQuest({source: {kind: 'sentence', text: weekBrief(goal)}, conversationId: chatId!, creator: user, goalId: goal.id});
  if (!conversationId) await sql`update goals set quest_id = ${quest.id}, updated_at = now() where id = ${goal.id}`;
  return {questId: quest.id, conversationId: chatId!};
}
