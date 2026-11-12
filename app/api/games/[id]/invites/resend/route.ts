import {NextResponse} from 'next/server';
import {withGame} from '@/lib/turf/http';
import {buildState, resendInvites} from '@/lib/turf/store';

/** Host only, once per invitee (§10.2). */
export async function POST(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => {
    const sent = await resendInvites(game, user);
    return NextResponse.json({sent, state: await buildState(game, user.id)});
  });
}
