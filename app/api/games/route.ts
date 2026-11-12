import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {turfError} from '@/lib/turf/http';
import {createGame, type CreateInput} from '@/lib/turf/store';

/** Create a Rally game from the library. Only Turf for now (§10.1). */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<CreateInput & {type?: string}>(req);
    if (!body) return badRequest('Invalid JSON');
    if (body.type !== 'turf') return badRequest('Unknown game type');
    try {
      const {game, state} = await createGame(user, body);
      return NextResponse.json({id: game.id, state}, {status: 201});
    } catch (e) {
      return turfError(e);
    }
  });
}
