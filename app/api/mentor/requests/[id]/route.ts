import {NextResponse, type NextRequest} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {getRequest, revoke} from '@/lib/activities/mentor';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const {id} = await ctx.params;
    const view = await getRequest(Number(id), user.id);
    return view ? NextResponse.json({request: view}) : notFound();
  });
}

/** Revoke from either side; transcript is kept. */
export async function DELETE(_req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const {id} = await ctx.params;
    return (await revoke(Number(id), user.id)) ? NextResponse.json({ok: true}) : notFound();
  });
}
