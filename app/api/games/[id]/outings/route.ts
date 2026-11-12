import {NextResponse} from 'next/server';
import {withGame} from '@/lib/turf/http';
import {startOuting} from '@/lib/turf/store';

/** Start an outing (or get the one already open). */
export async function POST(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => NextResponse.json({outing: await startOuting(game, user, 'live')}, {status: 201}));
}
