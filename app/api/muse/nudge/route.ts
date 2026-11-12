import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';
import {generateNudge} from '@/lib/muse/nudge';

export async function POST(req: Request) {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const body = await readJson<{
      recipientId?: number;
      recipientName?: string;
      context?: string;
      postId?: number;
      type?: string;
    }>(req);
    if (!body?.recipientId || !body.context) return badRequest('recipientId and context required');

    const nudge = await generateNudge({
      recipientName: body.recipientName ?? 'friend',
      actorName: user.name,
      context: body.context,
    });

    const [row] = await sql`
      insert into notifications (user_id, actor_id, type, post_id, message)
      values (
        ${body.recipientId},
        ${user.id},
        ${body.type ?? 'muse_nudge'},
        ${body.postId ?? null},
        ${nudge.message}
      )
      returning id, message, created_at`;

    return NextResponse.json({ok: true, notification: row, tone: nudge.tone});
  });
}
