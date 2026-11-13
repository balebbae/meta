import {NextResponse} from 'next/server';
import {badRequest} from '@/lib/api';
import {parseGpxTrack, tooUntimed} from '@/lib/turf/gpx';
import {withGame} from '@/lib/turf/http';
import {importRoute} from '@/lib/turf/store';

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload a GPX file (multipart field `file`, or the XML as the body). Same pipeline as live points. */
export async function POST(req: Request, ctx: {params: Promise<{id: string}>}) {
  return withGame(ctx, async (user, game) => {
    let xml = '';
    if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const file = (await req.formData()).get('file');
      if (!file || typeof file === 'string') return badRequest('Attach a .gpx file');
      if (file.size > MAX_BYTES) return badRequest('That GPX file is too large (8 MB max)');
      xml = await file.text();
    } else {
      xml = await req.text();
    }
    if (xml.length > MAX_BYTES) return badRequest('That GPX file is too large (8 MB max)');
    const track = parseGpxTrack(xml);
    const points = track.points;
    if (points.length < 2) return badRequest('No track points found in that file');
    // Untimed tracks (drawn routes) cannot prove pace, so they never claim territory (plan 5b).
    if (tooUntimed(track)) return badRequest('That GPX file has no timestamps, so it cannot claim territory. Export the recorded activity (with times) from your watch or app.');
    return NextResponse.json(await importRoute(game, user, points, 'gpx'));
  });
}
