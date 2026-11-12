import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {insertXpEvent} from '@/lib/closeness-queries';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';
import {scoreInteraction} from '@/lib/muse/score';

export async function POST(req: Request) {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const body = await readJson<{
      eventType?: string;
      detail?: string;
      friendName?: string;
      friendId?: number;
      sourceId?: number;
    }>(req);
    const eventType = body?.eventType;
    const detail = body?.detail;
    if (!eventType || !detail) return badRequest('eventType and detail required');

    const scored = await scoreInteraction({
      actorName: user.name,
      friendName: body?.friendName,
      eventType: eventType as 'reaction' | 'comment' | 'voice_note' | 'friend_accept' | 'message' | 'quest',
      detail,
    });

    await insertXpEvent({
      userId: user.id,
      friendId: body?.friendId ?? null,
      sourceType: eventType,
      sourceId: body?.sourceId ?? null,
      xp: scored.xp,
      reason: scored.reason,
    });

    return NextResponse.json({ok: true, ...scored});
  });
}
