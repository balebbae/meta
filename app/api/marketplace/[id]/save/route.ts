import {NextResponse} from 'next/server';
import {sql} from '@/lib/db';
import {withUser} from '@/lib/api';

type Ctx = {params: Promise<{id: string}>};

export async function POST(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    await sql`insert into marketplace_saved (listing_id, user_id) values (${Number(id)}, ${user.id}) on conflict do nothing`;
    return NextResponse.json({saved: true});
  });
}

export async function DELETE(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    await sql`delete from marketplace_saved where listing_id = ${Number(id)} and user_id = ${user.id}`;
    return NextResponse.json({saved: false});
  });
}
