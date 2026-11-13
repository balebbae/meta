import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {insertXpEvent, xpBlocked} from '@/lib/closeness-queries';
import {requireDatabase, requireMuse} from '@/lib/muse/guard';
import {scoreInteraction} from '@/lib/muse/score';
import {isScorableEvent, SCORABLE_EVENTS} from '@/lib/xp-guard';

/**
 * Score one closeness interaction. eventType must be on the server allowlist (lib/xp-guard.ts); the prompt
 * uses the server's own description of it, never client text (`detail` and `friendName` are ignored: prompt injection).
 * Deduped per (actor, friend, eventType, sourceId) and capped per day.
 */
export async function POST(req: Request) {
  const museErr = requireMuse();
  if (museErr) return museErr;
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const body = await readJson<{eventType?: string; friendId?: number; sourceId?: number}>(req);
    const eventType = body?.eventType;
    if (!isScorableEvent(eventType)) return badRequest(`eventType must be one of: ${Object.keys(SCORABLE_EVENTS).join(', ')}`);
    const friendId = Number.isInteger(body?.friendId) ? (body?.friendId as number) : null;
    const sourceId = Number.isInteger(body?.sourceId) ? (body?.sourceId as number) : null;
    const [friend] = friendId ? await sql`select name from users where id = ${friendId}` : [];
    if (friendId && !friend) return badRequest('Unknown friendId');

    const blocked = await xpBlocked({userId: user.id, friendId, sourceType: eventType, sourceId});
    if (blocked) return NextResponse.json({ok: false, xp: 0, reason: blocked}, {status: 429});

    const scored = await scoreInteraction({
      actorName: user.name,
      friendName: friend?.name as string | undefined,
      eventType,
      detail: SCORABLE_EVENTS[eventType],
    });

    await insertXpEvent({userId: user.id, friendId, sourceType: eventType, sourceId, xp: scored.xp, reason: scored.reason});

    return NextResponse.json({ok: true, ...scored});
  });
}
