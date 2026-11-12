import {NextResponse} from 'next/server';
import {withGame} from '@/lib/turf/http';
import {buildState, startGame} from '@/lib/turf/store';

export async function POST(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => NextResponse.json(await buildState(await startGame(game, user), user.id)));
}
