import {NextResponse} from 'next/server';
import {badRequest, notFound, withUser} from '@/lib/api';
import {recordPlay} from '@/lib/reels';

/** POST /api/reels/[id]/play: counts one play. */
export async function POST(_req: Request, ctx: {params: Promise<{id: string}>}) {
  return withUser(async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return badRequest('invalid id');
    const plays = await recordPlay(id);
    if (plays == null) return notFound();
    return NextResponse.json({plays});
  });
}
