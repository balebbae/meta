import {NextResponse} from 'next/server';
import {badRequest, withUser} from '@/lib/api';
import {recordFeedPlay} from '@/lib/reels';

export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return badRequest('Invalid reel id');
    await recordFeedPlay(id);
    return NextResponse.json({ok: true});
  });
}
