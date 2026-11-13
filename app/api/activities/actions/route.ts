import {NextResponse, type NextRequest} from 'next/server';
import {readJson, withUser} from '@/lib/api';
import {listActions, refreshActions} from '@/lib/activities/actions';

// Muse searches the web before answering; a refresh takes about 30 s.
export const maxDuration = 120;

/** GET → the owner's Muse action items. */
export async function GET() {
  return withUser(async user => NextResponse.json(await listActions(user.id)));
}

/** POST {lat?, lng?} → asks Muse for fresh suggestions. Coordinates are only used when no city is on the profile. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{lat?: unknown; lng?: unknown}>(req);
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const near = body?.lat != null && body?.lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? {lat, lng} : undefined;
    return NextResponse.json(await refreshActions(user.id, near));
  });
}
