import {NextResponse} from 'next/server';
import {badRequest, readJson} from '@/lib/api';
import type {GpsPoint} from '@/lib/turf/engine';
import {withGame} from '@/lib/turf/http';
import {addPoints} from '@/lib/turf/store';

/** Batch of GPS points -> cells -> cut / loop checks -> turf_cells. `finish` ends the outing. */
export async function PATCH(req: Request, ctx: {params: Promise<{id: string; outingId: string}>}) {
  return withGame(ctx, async (user, game) => {
    const {outingId} = await ctx.params;
    const id = Number(outingId);
    if (!Number.isInteger(id)) return badRequest('Invalid outing id');
    const body = await readJson<{points?: GpsPoint[]; finish?: boolean}>(req);
    if (!body) return badRequest('Invalid JSON');
    const points = Array.isArray(body.points) ? body.points : [];
    if (points.length > 2000) return badRequest('Too many points in one batch');
    const r = await addPoints(game, user, id, points, body.finish === true);
    return NextResponse.json(r);
  });
}
