import {NextResponse} from 'next/server';
import {importRecentStravaRuns} from '@/lib/activities/connectors/strava';
import {withGame} from '@/lib/turf/http';
import {listPlayers, TurfError} from '@/lib/turf/store';

export async function POST(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => {
    if (game.status !== 'live') throw new TurfError('This game is not live', 409);
    if (!(await listPlayers(game.id)).some(p => p.id === user.id && p.status === 'accepted')) {
      throw new TurfError('Accept the invite to import runs', 403);
    }
    return NextResponse.json(await importRecentStravaRuns(user.id, game.id));
  });
}
