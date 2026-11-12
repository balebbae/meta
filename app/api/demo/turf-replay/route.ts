import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {turfError} from '@/lib/turf/http';
import {buildState, canView, getGame, replayScript, resetBoard} from '@/lib/turf/store';

/**
 * Stage demo (§14): replays a recorded Katy Trail route as the signed-in player so the game can be
 * shown without walking. priya_loop closes a base and leaves an open trail; sarah_cut crosses that
 * trail and loops through the corner of the base. `reset` (host) wipes the board for a rehearsal.
 */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{gameId?: number; script?: string}>(req);
    const gameId = Number(body?.gameId);
    if (!body || !Number.isInteger(gameId)) return badRequest('gameId is required');
    if (body.script !== 'priya_loop' && body.script !== 'sarah_cut' && body.script !== 'reset') return badRequest("script must be 'priya_loop', 'sarah_cut' or 'reset'");
    try {
      const game = await getGame(gameId);
      if (!game || !(await canView(game, user.id))) return NextResponse.json({error: 'Not found'}, {status: 404});
      if (body.script === 'reset') {
        await resetBoard(game, user);
        return NextResponse.json({state: await buildState(game, user.id)});
      }
      const r = await replayScript(game, user, body.script);
      return NextResponse.json({...r, state: await buildState(game, user.id)});
    } catch (e) {
      return turfError(e);
    }
  });
}
