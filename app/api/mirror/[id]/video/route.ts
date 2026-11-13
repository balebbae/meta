import {notFound, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {memberOfGame} from '@/lib/rally/game-access';
import {loadClip, reelVideoUrl} from '@/lib/rally/reel-video';

/** Same-origin, Range-capable copy of the match's Reel video (see lib/rally/reel-video.ts). */
export async function GET(req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('mirror_matches', id, user.id))) return notFound();
    const [row] = await sql`select r.video_url from mirror_matches m join reels r on r.id = m.reel_id where m.id = ${id}`;
    const url = reelVideoUrl(row?.video_url);
    if (!url) return notFound();
    let clip: {bytes: Uint8Array; type: string};
    try {
      clip = await loadClip(url);
    } catch {
      return new Response('Reel video unavailable right now', {status: 502});
    }
    const size = clip.bytes.length;
    const headers = new Headers({'content-type': clip.type, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600'});
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
    if (!m || (m[1] === '' && m[2] === '')) {
      headers.set('content-length', String(size));
      return new Response(clip.bytes.slice(), {status: 200, headers});
    }
    const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
    const end = m[1] !== '' && m[2] !== '' ? Math.min(size - 1, Number(m[2])) : size - 1;
    if (start >= size || start > end) return new Response(null, {status: 416, headers: {'content-range': `bytes */${size}`}});
    headers.set('content-range', `bytes ${start}-${end}/${size}`);
    headers.set('content-length', String(end - start + 1));
    return new Response(clip.bytes.slice(start, end + 1), {status: 206, headers});
  });
}
