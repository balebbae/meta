import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {withUser} from '@/lib/api';
import {isFitnessText} from '@/lib/activities/discover';
import {canPrompt} from '@/lib/activities/prompts';

export const dynamic = 'force-dynamic';

/** Activity meta for one event: fitness-y?, Boss fight IRL link, real count of the viewer's friends going, prompt allowance. */
export async function GET(_req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const {id} = await ctx.params;
    const [e] = await sql`select id, title, settings from events where id = ${Number(id)}`;
    if (!e) return NextResponse.json({error: 'Not found'}, {status: 404});
    const settings = (e.settings as {fitness?: boolean; bossFight?: boolean; questId?: number}) ?? {};
    const friends = await sql`
      select u.name from event_rsvps r join friendships f on f.friend_id = r.user_id and f.user_id = ${user.id} and f.status = 'accepted'
      join users u on u.id = r.user_id where r.event_id = ${e.id} and r.status = 'going' order by u.name`;
    const quest = settings.questId ? (await sql`select title from quests where id = ${settings.questId}`.catch(() => []))[0] : undefined;
    return NextResponse.json({
      fitness: !!settings.fitness || isFitnessText(e.title as string),
      bossFight: !!settings.bossFight || /boss fight/i.test(e.title as string),
      questTitle: (quest?.title as string | undefined) ?? null,
      friendsGoing: friends.length,
      names: friends.slice(0, 3).map(r => (r.name as string).split(' ')[0]),
      allowed: await canPrompt(user.id, 'event_train'),
    });
  });
}
