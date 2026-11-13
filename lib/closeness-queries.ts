import {sql} from '@/lib/db';

export type LeaderboardRow = {
  userId: number;
  name: string;
  avatarUrl: string;
  xp: number;
};

export async function insertXpEvent(opts: {
  userId: number;
  friendId?: number | null;
  sourceType: string;
  sourceId?: number | null;
  xp: number;
  reason: string;
}) {
  await sql`
    insert into xp_events (user_id, friend_id, source_type, source_id, xp, reason)
    values (
      ${opts.userId},
      ${opts.friendId ?? null},
      ${opts.sourceType},
      ${opts.sourceId ?? null},
      ${opts.xp},
      ${opts.reason}
    )`;
}

export async function weekLeaderboard(viewerId: number, limit = 10): Promise<LeaderboardRow[]> {
  const rows = await sql`
    with friends as (
      select case when f.user_id = ${viewerId} then f.friend_id else f.user_id end as id
      from friendships f
      where f.status = 'accepted' and (f.user_id = ${viewerId} or f.friend_id = ${viewerId})
    ),
    pool as (
      select ${viewerId} as id
      union
      select id from friends
    )
    select u.id as user_id, u.name, u.avatar_url, coalesce(sum(x.xp), 0)::int as xp
    from pool p
    join users u on u.id = p.id
    left join xp_events x on x.user_id = u.id and x.created_at > now() - interval '7 days' and x.source_type not like 'rally%'
    group by u.id, u.name, u.avatar_url
    order by xp desc, u.name asc
    limit ${limit}`;
  return rows.map(r => ({
    userId: r.user_id as number,
    name: r.name as string,
    avatarUrl: r.avatar_url as string,
    xp: r.xp as number,
  }));
}

export async function listActiveQuests(userId: number) {
  const rows = await sql`
    select q.id, q.title, q.description, q.xp_reward, q.goal_type, q.goal_count, q.week_start,
           coalesce(qp.status, 'active') as status, qp.progress
    from quests q
    left join quest_progress qp on qp.quest_id = q.id and qp.user_id = ${userId}
    where q.week_start >= date_trunc('week', now())::date
    order by q.id asc`;
  return rows.map(r => ({
    id: r.id as number,
    title: r.title as string,
    description: r.description as string,
    xpReward: r.xp_reward as number,
    goalType: r.goal_type as string,
    goalCount: r.goal_count as number,
    weekStart: String(r.week_start),
    status: r.status as string,
    progress: r.progress as Record<string, unknown> | null,
  }));
}

export async function insertQuests(
  quests: {
    title: string;
    description: string;
    xpReward: number;
    goalType: string;
    goalCount: number;
  }[],
) {
  const weekStart = new Date();
  const day = weekStart.getUTCDay();
  const diff = (day + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  const week = weekStart.toISOString().slice(0, 10);

  for (const q of quests) {
    await sql`
      insert into quests (title, description, xp_reward, goal_type, goal_count, week_start, muse_meta)
      values (
        ${q.title},
        ${q.description},
        ${q.xpReward},
        ${q.goalType},
        ${q.goalCount},
        ${week}::date,
        ${JSON.stringify({source: 'muse-spark'})}::jsonb
      )`;
  }
}
