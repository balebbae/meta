import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {insertQuests, listActiveQuests} from '@/lib/closeness-queries';
import {sql} from '@/lib/db';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';
import {generateWeeklyQuests} from '@/lib/muse/quests';

export async function POST() {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const existing = await listActiveQuests(user.id);
    if (existing.length > 0) {
      return NextResponse.json({ok: true, quests: existing, cached: true});
    }

    const friends = await sql`
      select u.name from friendships f
      join users u on u.id = case when f.user_id = ${user.id} then f.friend_id else f.user_id end
      where f.status = 'accepted' and (f.user_id = ${user.id} or f.friend_id = ${user.id})
      limit 8`;
    const drafts = await generateWeeklyQuests(friends.map(f => f.name as string));
    await insertQuests(drafts);
    const quests = await listActiveQuests(user.id);
    return NextResponse.json({ok: true, quests, cached: false});
  });
}
