import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {readJson, withUser} from '@/lib/api';
import {generateNudge} from '@/lib/muse/nudge';
import {museConfigured} from '@/lib/muse/client';
import {sendPushToUser} from '@/lib/push';

export const dynamic = 'force-dynamic';

/**
 * POST {kind?: 'quest_drop' | 'boss_low' | 'mentor', questId?} — writes a notifications row (+ push) for the caller,
 * e.g. "your quest drops today". Muse (Ember) writes the copy when configured; deterministic template otherwise.
 */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = (await readJson<{kind?: string; questId?: number}>(req).catch(() => null)) ?? {};
    const kind = body.kind ?? 'quest_drop';
    const quest = body.questId
      ? (await sql`select id, title, boss_hp_left from quests where id = ${body.questId}`.catch(() => []))[0]
      : (await sql`select id, title, boss_hp_left from quests where status = 'active' and template is not null and (created_by = ${user.id} or exists (select 1 from quest_moves qm where qm.quest_id = quests.id and qm.user_id = ${user.id})) order by id desc limit 1`.catch(() => []))[0];
    const title = (quest?.title as string | undefined) ?? 'your weekly quest';
    const context = kind === 'boss_low' ? `The boss in "${title}" is almost down; one more move finishes it.` : kind === 'mentor' ? 'Someone a few months ahead of you connected; your Muses are talking.' : `Your Rally quest "${title}" drops today. First move counts double if it happens before 6pm.`;
    const fallback = kind === 'boss_low' ? `Boss almost down in ${title} — one more move finishes it.` : kind === 'mentor' ? 'They said yes. Your Muses are talking now.' : `Your quest drops today: ${title}. Make the first move before 6pm for double.`;
    let message = fallback;
    let museOffline = true;
    if (museConfigured()) {
      try {
        message = (await generateNudge({recipientName: user.name, actorName: 'Rally', context})).message || fallback;
        museOffline = false;
      } catch {
        message = fallback;
      }
    }
    const url = quest?.id ? `/activities/games/${quest.id}` : '/activities';
    const [row] = await sql`insert into notifications (user_id, actor_id, type, message) values (${user.id}, null, ${`activities_${kind}`}, ${message}) returning id`;
    await sendPushToUser(user.id, {title: 'Activities', body: message, url, tag: `activities-${kind}`}).catch(() => {});
    return NextResponse.json({id: row.id, message, museOffline, url}, {status: 201});
  });
}
