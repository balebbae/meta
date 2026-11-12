import {NextResponse} from 'next/server';
import {badRequest, notFound, withUser} from '@/lib/api';
import type {User} from '@/lib/types';
import {canView, getGame, TurfError, type Game} from './store';

type Ctx = {params: Promise<{id: string}>};

export function turfError(e: unknown): Response {
  if (e instanceof TurfError) return NextResponse.json({error: e.message}, {status: e.status});
  console.error('[turf]', e);
  return NextResponse.json({error: 'Something went wrong'}, {status: 500});
}

/** Session (401) -> game exists and the viewer may see it (404) -> handler; TurfError -> its status. */
export function withGame(ctx: Ctx, fn: (user: User, game: Game) => Promise<Response>): Promise<Response> {
  return withUser(async user => {
    const {id} = await ctx.params;
    const gameId = Number(id);
    if (!Number.isInteger(gameId)) return badRequest('Invalid game id');
    try {
      const game = await getGame(gameId);
      if (!game || !(await canView(game, user.id))) return notFound();
      return await fn(user, game);
    } catch (e) {
      return turfError(e);
    }
  });
}
