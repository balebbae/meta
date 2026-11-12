import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {turfError} from '@/lib/turf/http';
import {addZone, listZones, removeZone} from '@/lib/turf/store';

/** Privacy zones (§7.4): GPS points inside a zone are dropped before they reach any game. Owner only. */
export async function GET() {
  return withUser(async user => NextResponse.json({zones: await listZones(user.id)}));
}

export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{label?: string; lat: number; lng: number; radiusM?: number}>(req);
    if (!body) return badRequest('Invalid JSON');
    try {
      return NextResponse.json({zones: await addZone(user.id, body)}, {status: 201});
    } catch (e) {
      return turfError(e);
    }
  });
}

export async function DELETE(req: Request) {
  return withUser(async user => {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!Number.isInteger(id)) return badRequest('id is required');
    return NextResponse.json({zones: await removeZone(user.id, id)});
  });
}
