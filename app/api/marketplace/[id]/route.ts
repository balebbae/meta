import {NextResponse} from 'next/server';
import {sql} from '@/lib/db';
import {forbidden, notFound, withUser} from '@/lib/api';
import {getListing} from '@/lib/secondary-queries';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    const listing = await getListing(user.id, Number(id));
    return listing ? NextResponse.json({listing}) : notFound();
  });
}

export async function DELETE(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    const listing = await getListing(user.id, Number(id));
    if (!listing) return notFound();
    if (listing.seller.id !== user.id) return forbidden();
    await sql`delete from marketplace_listings where id = ${listing.id}`;
    return NextResponse.json({ok: true});
  });
}
