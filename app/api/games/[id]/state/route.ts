import {NextResponse} from 'next/server';
import {withGame} from '@/lib/turf/http';
import {buildState} from '@/lib/turf/store';

export const dynamic = 'force-dynamic';

/** Cells, owners, scores, players, status, endsAt. Never routes or positions. */
export async function GET(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => NextResponse.json(await buildState(game, user.id), {headers: {'Cache-Control': 'no-store'}}));
}
