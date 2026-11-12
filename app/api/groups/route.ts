import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, readJson, withUser} from '@/lib/api';
import {getGroup, listGroups} from '@/lib/secondary-queries';

const COVER = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&h=600&q=80';
const ICON = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&h=200&q=80';

export async function GET(_req: NextRequest) {
  return withUser(async user => NextResponse.json({groups: await listGroups(user.id)}));
}

export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{name?: string; description?: string | null; privacy?: string; coverUrl?: string; iconUrl?: string}>(req);
    const name = body?.name?.trim();
    if (!name) return badRequest('name is required');
    const privacy = body?.privacy === 'private' ? 'private' : 'public';
    const existing = await sql`select id from groups where name = ${name}`;
    if (existing[0]) return badRequest('A group with that name already exists');
    const [row] = await sql`
      insert into groups (name, description, cover_url, icon_url, privacy, created_by)
      values (${name}, ${body?.description?.trim() || null}, ${body?.coverUrl?.trim() || COVER}, ${body?.iconUrl?.trim() || ICON}, ${privacy}, ${user.id})
      returning id`;
    await sql`insert into group_members (group_id, user_id, role) values (${row.id as number}, ${user.id}, 'admin') on conflict do nothing`;
    const group = await getGroup(user.id, row.id as number);
    return NextResponse.json({group}, {status: 201});
  });
}
