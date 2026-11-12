import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, readJson, withUser} from '@/lib/api';
import {listEvents} from '@/lib/secondary-queries';

const COVER = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1280&h=720&q=80';

export async function GET(_req: NextRequest) {
  return withUser(async user => NextResponse.json({events: await listEvents(user.id)}));
}

export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{title?: string; description?: string | null; location?: string; coverUrl?: string; startsAt?: string; endsAt?: string | null; isOnline?: boolean}>(req);
    const title = body?.title?.trim();
    if (!title) return badRequest('title is required');
    const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
    if (!startsAt || Number.isNaN(startsAt.getTime())) return badRequest('startsAt must be a valid date');
    const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
    const [row] = await sql`
      insert into events (host_id, title, description, location, cover_url, starts_at, ends_at, is_online)
      values (${user.id}, ${title}, ${body?.description?.trim() || null}, ${body?.location?.trim() || 'Dallas, TX'}, ${body?.coverUrl?.trim() || COVER},
              ${startsAt.toISOString()}, ${endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null}, ${Boolean(body?.isOnline)})
      returning id`;
    const events = await listEvents(user.id);
    return NextResponse.json({event: events.find(e => e.id === (row.id as number)) ?? null}, {status: 201});
  });
}
