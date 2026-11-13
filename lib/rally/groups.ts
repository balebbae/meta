/**
 * Group activities: a Rally quest posted into groups as a sign-up post. Joining = a quest_progress row
 * (so the quest page, moves and scoring just work) + a seat in the quest's crew chat. quests.capacity caps the rows.
 */
import {FOCUS_QUESTION, type Focus} from '@/lib/rally/fairness';
import {readinessFor} from '@/lib/rally/handicap';
import {getSql, sql} from '@/lib/db';
import {addMembers, sendMessage} from '@/lib/messaging-queries';
import {rankGroups} from '@/lib/rally/group-match';
import {getQuest} from '@/lib/rally/queries';

export const DEFAULT_SPOTS = 10;
const clampSpots = (n: number) => Math.min(100, Math.max(2, Math.round(n)));

async function goingCount(questId: number): Promise<number> {
  const [r] = await sql`select count(*)::int as n from quest_progress where quest_id = ${questId}`;
  return Number(r.n);
}

/** Groups the viewer can post to (theirs + any public one), relevant first, with where it's already posted. */
export async function shareTargets(questId: number, userId: number) {
  const quest = await getQuest(questId);
  if (!quest) return null;
  const rows = await sql`
    select g.id, g.name, g.description, g.icon_url, g.privacy,
      (select count(*)::int from group_members x where x.group_id = g.id) as member_count,
      exists(select 1 from group_posts gp where gp.group_id = g.id and gp.quest_id = ${questId}) as posted,
      exists(select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${userId}) as member
    from groups g
    where g.privacy = 'public' or exists(select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${userId})
    order by member desc, g.name`;
  const groups = rankGroups(`${quest.title} ${quest.spec.story}`, rows.map(r => ({
    id: r.id as number,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    iconUrl: r.icon_url as string,
    privacy: r.privacy as 'public' | 'private',
    memberCount: r.member_count as number,
    posted: Boolean(r.posted),
    member: Boolean(r.member),
  })));
  const [q] = await sql`select capacity from quests where id = ${questId}`;
  return {groups, capacity: (q?.capacity as number | null) ?? null, going: await goingCount(questId)};
}

/** Posts into each listed group (joining public ones first, like posting on Facebook). Skips groups it's already in. Capacity is quest-wide. */
export async function shareQuestToGroups(questId: number, user: {id: number; name: string}, groupIds: number[], spots: number, note: string): Promise<number[]> {
  const quest = await getQuest(questId);
  if (!quest) return [];
  // never set the cap below the people already in
  const capacity = clampSpots(Math.max(spots, await goingCount(questId)));
  await sql`update quests set capacity = ${capacity} where id = ${questId}`;
  const content = note.trim() || `Who's in? ${quest.title}, ${capacity} spots.`;
  await sql`
    insert into group_members (group_id, user_id, role)
    select g.id, ${user.id}, 'member' from groups g where g.id = any(${groupIds}::int[]) and g.privacy = 'public'
    on conflict do nothing`;
  const rows = await sql`
    insert into group_posts (group_id, author_id, content, quest_id)
    select gm.group_id, ${user.id}, ${content}, ${questId} from group_members gm
    where gm.user_id = ${user.id} and gm.group_id = any(${groupIds}::int[])
      and not exists (select 1 from group_posts gp where gp.group_id = gm.group_id and gp.quest_id = ${questId})
    returning group_id`;
  return rows.map(r => r.group_id as number);
}

export type JoinResult = {ok: true; questId: number; going: number; capacity: number | null} | {ok: false; status: 404 | 409; error: string};

/** Sign up from a group post. Idempotent; refuses when full or over. */
export async function joinFromGroupPost(groupId: number, postId: number, user: {id: number; name: string}): Promise<JoinResult> {
  const [p] = await sql`
    select gp.quest_id, g.name as group_name, g.privacy,
      exists(select 1 from group_members gm where gm.group_id = g.id and gm.user_id = ${user.id}) as is_member
    from group_posts gp join groups g on g.id = gp.group_id
    where gp.id = ${postId} and gp.group_id = ${groupId} and gp.quest_id is not null`;
  // same visibility rule as the group page: private posts are members-only
  if (!p || (p.privacy === 'private' && !p.is_member)) return {ok: false, status: 404, error: 'Not found'};
  const questId = p.quest_id as number;
  const db = getSql();
  // the advisory lock serialises joiners, so the count check in the insert sees every earlier join
  const [, inserted] = await db.transaction([
    db`select pg_advisory_xact_lock(hashtext('quest_join'), ${questId}::int)`,
    db`
      insert into quest_progress (quest_id, user_id, status, progress)
      select q.id, ${user.id}, 'active', '{}'::jsonb from quests q
      where q.id = ${questId} and q.status = 'active' and (q.ends_at is null or q.ends_at > now())
        and (q.capacity is null or (select count(*) from quest_progress x where x.quest_id = q.id) < q.capacity)
      on conflict (quest_id, user_id) do nothing
      returning user_id`,
  ]);
  const [q] = await sql`select q.status, q.ends_at, q.capacity, q.conversation_id,
      exists(select 1 from quest_progress x where x.quest_id = q.id and x.user_id = ${user.id}) as joined
    from quests q where q.id = ${questId}`;
  const capacity = (q.capacity as number | null) ?? null;
  const going = await goingCount(questId);
  if (!inserted.length) {
    if (q.joined) return {ok: true, questId, going, capacity};
    const over = q.status !== 'active' || (q.ends_at && new Date(q.ends_at as string) <= new Date());
    return {ok: false, status: 409, error: over ? 'This activity has ended.' : `All ${capacity} spots are taken.`};
  }
  // the joiner's private good-match / stretch light, same rule as the players the game was built for
  try {
    const [m] = await sql`select muse_meta->>'focus' as focus from quests where id = ${questId}`;
    const fit = await readinessFor(user.id, FOCUS_QUESTION[m?.focus as Focus] ? (m.focus as Focus) : 'general');
    if (fit) await sql`update quest_progress set progress = coalesce(progress, '{}'::jsonb) || ${JSON.stringify({readiness: fit})}::jsonb where quest_id = ${questId} and user_id = ${user.id}`;
  } catch {
    // no light is fine; joining must not fail on it
  }
  const conversationId = q.conversation_id as number | null;
  if (conversationId) {
    await addMembers(conversationId, [user.id]);
    const text = `${user.name.split(' ')[0]} joined from ${p.group_name as string} · ${going}${capacity ? `/${capacity}` : ''} going`;
    await sendMessage(conversationId, user, text, null, {kind: 'system', payload: {text}}).catch(() => {});
  }
  return {ok: true, questId, going, capacity};
}
