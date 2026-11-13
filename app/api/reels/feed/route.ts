import {NextResponse, type NextRequest} from 'next/server';
import {withUser} from '@/lib/api';
import {listFeedReels} from '@/lib/reels';

/** GET /api/reels/feed?after=&limit= -> {reels, nextAfter}: the general "For you" Reels (newest first). */
export async function GET(req: NextRequest) {
  return withUser(async () => {
    const p = req.nextUrl.searchParams;
    const after = Number(p.get('after'));
    const limit = Number(p.get('limit'));
    const reels = await listFeedReels({after: Number.isInteger(after) && after > 0 ? after : undefined, limit: Number.isInteger(limit) && limit > 0 ? limit : undefined});
    return NextResponse.json({reels, nextAfter: reels.length ? reels[reels.length - 1].id : null});
  });
}
