import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {awardXp} from '@/lib/closeness-queries';
import {requireDatabase} from '@/lib/muse/guard';
import {isScorableEvent, SCORABLE_EVENTS} from '@/lib/xp-guard';

/**
 * Score one closeness interaction deterministically (lib/muse/score.ts, no model). eventType must be on the server
 * allowlist (lib/xp-guard.ts); client `detail` and `friendName` are ignored. Deduped per (actor, friend, eventType, sourceId) and capped per day.
 */
export async function POST(req: Request) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  return withUser(async user => {
    const body = await readJson<{eventType?: string; friendId?: number; sourceId?: number}>(req);
    const eventType = body?.eventType;
    if (!isScorableEvent(eventType)) return badRequest(`eventType must be one of: ${Object.keys(SCORABLE_EVENTS).join(', ')}`);
    const friendId = Number.isInteger(body?.friendId) ? (body?.friendId as number) : null;
    const sourceId = Number.isInteger(body?.sourceId) ? (body?.sourceId as number) : null;
    const [friend] = friendId ? await sql`select 1 from users where id = ${friendId}` : [];
    if (friendId && !friend) return badRequest('Unknown friendId');

    const scored = await awardXp({userId: user.id, friendId, sourceType: eventType, sourceId});
    if ('blocked' in scored) return NextResponse.json({ok: false, xp: 0, reason: scored.blocked}, {status: 429});

    return NextResponse.json({ok: true, ...scored});
  });
}
