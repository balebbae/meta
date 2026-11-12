import {NextResponse} from 'next/server';
import {sql} from '@/lib/db';
import {notFound, withUser} from '@/lib/api';

type Ctx = {params: Promise<{id: string}>};

export async function POST(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    const ev = await sql`select id from events where id = ${Number(id)}`;
    if (!ev[0]) return notFound();
    const inserted = await sql`
      insert into event_rsvps (event_id, user_id, status) values (${Number(id)}, ${user.id}, 'interested')
      on conflict (event_id, user_id) do update set status = 'interested'
      returning (xmax = 0) as is_new`;
    if (inserted[0]?.is_new) await sql`update events set interested_count = interested_count + 1 where id = ${Number(id)}`;
    return NextResponse.json({status: 'interested'});
  });
}

export async function DELETE(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    const deleted = await sql`delete from event_rsvps where event_id = ${Number(id)} and user_id = ${user.id} returning id`;
    if (deleted[0]) await sql`update events set interested_count = greatest(interested_count - 1, 0) where id = ${Number(id)}`;
    return NextResponse.json({status: null});
  });
}
