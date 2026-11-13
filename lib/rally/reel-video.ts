/**
 * Same-origin copies of Reel videos for Mirror Yoga / Mirror Dance. Pixabay's CDN sends no CORS headers, and the
 * pose model can only read frames from a video the page may read. Only Pixabay https URLs are fetched (no SSRF).
 * Each clip is downloaded once and kept in memory (a few MB), and createMirrorMatch warms it so the first player
 * doesn't wait on Pixabay.
 */
const MAX_BYTES = 15_000_000;
const MAX_CLIPS = 8;
const cache = new Map<string, Promise<{bytes: Uint8Array; type: string}>>();

/** The Reel's URL if it's one we may fetch, else null. */
export function reelVideoUrl(raw: unknown): URL | null {
  try {
    const url = new URL(String(raw ?? ''));
    return url.protocol === 'https:' && url.hostname === 'cdn.pixabay.com' ? url : null;
  } catch {
    return null;
  }
}

export function loadClip(url: URL) {
  const key = url.toString();
  let hit = cache.get(key);
  if (!hit) {
    const once = async () => {
      const res = await fetch(url, {signal: AbortSignal.timeout(15_000)});
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > MAX_BYTES) throw new Error('clip too large');
      return {bytes, type: res.headers.get('content-type') ?? 'video/mp4'};
    };
    // Pixabay occasionally drops a request; one retry beats failing the player's whole Reel read
    hit = once().catch(once);
    cache.set(key, hit);
    hit.catch(() => cache.delete(key));
    // shortcut: oldest-first eviction, fine for a handful of active matches per instance
    if (cache.size > MAX_CLIPS) cache.delete(cache.keys().next().value!);
  }
  return hit;
}

/** Start downloading a Reel now so the first player's phone gets it from memory. Never throws. */
export async function warmClip(raw: unknown) {
  const url = reelVideoUrl(raw);
  if (url) await loadClip(url).catch(() => {});
}
