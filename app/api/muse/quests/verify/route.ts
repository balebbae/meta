import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {insertXpEvent} from '@/lib/closeness-queries';
import {sql} from '@/lib/db';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';
import {verifyQuestCompletion} from '@/lib/muse/quests';

export async function POST(req: Request) {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const body = await readJson<{questId?: number; evidence?: string}>(req);
    if (!body?.questId || !body.evidence) return badRequest('questId and evidence required');

    const [quest] = await sql`select * from quests where id = ${body.questId}`;
    if (!quest) return NextResponse.json({error: 'Not found'}, {status: 404});

    const result = await verifyQuestCompletion({
      title: quest.title as string,
      description: quest.description as string,
      goalType: quest.goal_type as string,
      goalCount: quest.goal_count as number,
      evidence: body.evidence,
    });

    if (result.completed) {
      await sql`
        insert into quest_progress (quest_id, user_id, status, progress)
        values (${body.questId}, ${user.id}, 'completed', ${JSON.stringify({note: result.progressNote})}::jsonb)
        on conflict (quest_id, user_id) do update
          set status = 'completed', progress = excluded.progress, updated_at = now()`;
      await insertXpEvent({
        userId: user.id,
        sourceType: 'quest',
        sourceId: body.questId,
        xp: quest.xp_reward as number,
        reason: `Completed quest: ${quest.title}`,
      });
    }

    return NextResponse.json({ok: true, ...result});
  });
}
