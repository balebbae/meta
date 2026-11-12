import {NextResponse} from 'next/server';
import {sql} from '@/lib/db';
import {notFound, withUser} from '@/lib/api';

type Ctx = {params: Promise<{id: string}>};

export async function POST(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    const group = await sql`select id from groups where id = ${Number(id)}`;
    if (!group[0]) return notFound();
    await sql`insert into group_members (group_id, user_id) values (${Number(id)}, ${user.id}) on conflict do nothing`;
    return NextResponse.json({joined: true});
  });
}

export async function DELETE(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    await sql`delete from group_members where group_id = ${Number(id)} and user_id = ${user.id}`;
    return NextResponse.json({joined: false});
  });
}
