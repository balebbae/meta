import {sql} from '@/lib/db';
import type {LeaderboardRow} from '@/lib/closeness-queries';

/** Fitness tab: ranks this week's Rally XP (xp_events.source_type like 'rally%', e.g. 'rally_move') among the viewer + friends. */
export async function fitnessWeekLeaderboard(viewerId: number, limit = 10): Promise<LeaderboardRow[]> {
  const rows = await sql`
    with friends as (
      select f.friend_id as id from friendships f where f.status = 'accepted' and f.user_id = ${viewerId}
    ),
    pool as (select ${viewerId} as id union select id from friends)
    select u.id as user_id, u.name, u.avatar_url, coalesce(sum(x.xp), 0)::int as xp
    from pool p join users u on u.id = p.id
    left join xp_events x on x.user_id = u.id and x.created_at > now() - interval '7 days' and x.source_type like 'rally%'
    group by u.id, u.name, u.avatar_url
    order by xp desc, u.name asc
    limit ${limit}`;
  return rows.map(r => ({userId: r.user_id as number, name: r.name as string, avatarUrl: r.avatar_url as string, xp: Number(r.xp)}));
}
