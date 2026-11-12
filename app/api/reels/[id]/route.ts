import {NextResponse} from 'next/server';
import {badRequest, notFound, withUser} from '@/lib/api';
import {getReel} from '@/lib/reels';

export async function GET(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withUser(async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return badRequest('invalid id');
    const reel = await getReel(id);
    if (!reel) return notFound();
    return NextResponse.json({reel});
  });
}
