import type {GpsPoint} from './engine.ts';

/** Share of points that may lack a <time> before a file is refused for territory claims (plan 5b). */
export const MAX_UNTIMED_SHARE = 0.1;

/**
 * Minimal GPX reader: every <trkpt>/<rtept>/<wpt> with lat/lon. Points without <time> are spaced at a
 * walking pace (1.4 m/s) from `fallbackStart` so the speed filter still has something to judge, and are
 * counted in `untimed`: a drawn route has no times, so the upload path refuses mostly-untimed files.
 */
export function parseGpxTrack(xml: string, fallbackStart = Date.now()): {points: GpsPoint[]; untimed: number} {
  const out: GpsPoint[] = [];
  const re = /<(trkpt|rtept|wpt)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  let m: RegExpExecArray | null;
  let synthetic = fallbackStart;
  let prev: GpsPoint | null = null;
  let untimed = 0;
  while ((m = re.exec(xml))) {
    const attrs = m[2];
    const lat = Number(/\blat\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1]);
    const lng = Number(/\blon\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const time = /<time>\s*([^<]+?)\s*<\/time>/.exec(m[3] ?? '')?.[1];
    let t = time ? Date.parse(time) : NaN;
    if (!Number.isFinite(t)) {
      untimed++;
      if (prev) {
        const dLat = (lat - prev.lat) * 111_320;
        const dLng = (lng - prev.lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
        synthetic = prev.t + Math.max(1000, (Math.hypot(dLat, dLng) / 1.4) * 1000);
      }
      t = synthetic;
    }
    prev = {lat, lng, t: Math.round(t)};
    out.push(prev);
  }
  return {points: out, untimed};
}

export function parseGpx(xml: string, fallbackStart = Date.now()): GpsPoint[] {
  return parseGpxTrack(xml, fallbackStart).points;
}

/** True when too many points have no real timestamp to judge speed, so the track cannot claim cells. */
export function tooUntimed(track: {points: GpsPoint[]; untimed: number}): boolean {
  return track.points.length > 0 && track.untimed / track.points.length > MAX_UNTIMED_SHARE;
}
