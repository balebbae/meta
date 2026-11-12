import {NextResponse} from 'next/server';
import {badRequest, readJson} from '@/lib/api';
import {withGame} from '@/lib/turf/http';
import {buildState, respondInvite} from '@/lib/turf/store';

export async function POST(req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => {
    const body = await readJson<{status?: string; locationConsent?: boolean}>(req);
    if (!body || (body.status !== 'accepted' && body.status !== 'declined')) return badRequest("status must be 'accepted' or 'declined'");
    await respondInvite(game, user, body.status, body.locationConsent === true);
    return NextResponse.json(await buildState(game, user.id));
  });
}
