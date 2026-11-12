import {NextResponse} from 'next/server';
import {withGame} from '@/lib/turf/http';
import {buildState, leaveGame} from '@/lib/turf/store';

/** Leaving turns your cells neutral. */
export async function POST(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => {
    await leaveGame(game, user);
    return NextResponse.json(await buildState(game, user.id));
  });
}
