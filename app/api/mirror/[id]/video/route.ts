import {notFound, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {memberOfGame} from '@/lib/rally/game-access';

/**
 * Same-origin copy of the Reel video. Pixabay's CDN sends no CORS headers, and the pose model can only read
 * frames from a video the page may read. Only Pixabay video URLs are fetched (no SSRF). Each clip is downloaded
 * once and kept in memory (they're a few MB), so the player's many Range requests don't each go back to Pixabay.
 */
const MAX_BYTES = 15_000_000;
const MAX_CLIPS = 8;
const cache = new Map<string, Promise<{bytes: Uint8Array; type: string}>>();

function load(url: URL) {
  const key = url.toString();
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const res = await fetch(url, {signal: AbortSignal.timeout(30_000)});
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > MAX_BYTES) throw new Error('clip too large');
      return {bytes, type: res.headers.get('content-type') ?? 'video/mp4'};
    })();
    cache.set(key, hit);
    hit.catch(() => cache.delete(key));
    // shortcut: oldest-first eviction, fine for a handful of active matches per instance
    if (cache.size > MAX_CLIPS) cache.delete(cache.keys().next().value!);
  }
  return hit;
}

export async function GET(req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('mirror_matches', id, user.id))) return notFound();
    const [row] = await sql`select r.video_url from mirror_matches m join reels r on r.id = m.reel_id where m.id = ${id}`;
    let url: URL;
    try {
      url = new URL(String(row?.video_url ?? ''));
    } catch {
      return notFound();
    }
    if (url.protocol !== 'https:' || url.hostname !== 'cdn.pixabay.com') return notFound();
    let clip: {bytes: Uint8Array; type: string};
    try {
      clip = await load(url);
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
