/**
 * Turf engine (spec §10.3, §7.4). Pure and deterministic: no DB, no clock, no network.
 * GPS points go in, H3 cells come out. Routes and positions never leave this module's inputs;
 * game state is only ever cells and owners.
 */
import {cellToLatLng, gridDisk, gridPathCells, latLngToCell, polygonToCells} from 'h3-js';

export const TURF_RES = 11;
export const TRIM_M = 200;
/** Per-outing trim range; see outingTrimM. */
export const TRIM_MIN_M = 150;
export const TRIM_MAX_M = 400;
export const MAX_KMH = 25;
/** fastPoints windows (s) and allowances: see there. Tuned so 20 m jitter at 1 Hz passes and a 20 km/h car in a walk doesn't. */
const CAP_WINDOW_S = 20;
const SLACK_M = 60;
const SPEED_HALF_S = 30;
const BASE_S = 60;
/** Sustained speed jump (m/s) above the local walking/running pace treated like a speed violation. */
export const MAX_STEP_MS = 3;
export const CLOSE_M = 50;
const AWAY_M = 120;
const MAX_GAP_CELLS = 8;

export type LatLng = {lat: number; lng: number};
/** t = epoch milliseconds. */
export type GpsPoint = LatLng & {t: number};
export type Arena = {center: LatLng; radiusKm: number};
export type Zone = LatLng & {radiusM: number};
/** hidden = within the trim distance of the outing's ends or a privacy zone: usable for closing a loop, never claimed or shown. */
export type TrailCell = {cell: string; t: number; hidden?: boolean};

export type TrailOptions = {
  zones?: Zone[];
  trimM?: number;
  maxKmh?: number;
  /** Return hidden cells too (flagged). Server-only bookkeeping; the default drops them. */
  keepHidden?: boolean;
  /** GPS measurement noise (m) for the Kalman/RTS smoother; 0 turns smoothing off. */
  smoothM?: number;
};

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function cellCenter(cell: string): LatLng {
  const [lat, lng] = cellToLatLng(cell);
  return {lat, lng};
}

export function inArena(p: LatLng, arena: Arena): boolean {
  return haversineM(p, arena.center) <= arena.radiusKm * 1000;
}

/** Every cell whose centre is inside the arena circle. */
export function arenaCells(arena: Arena, res = TURF_RES): string[] {
  const origin = latLngToCell(arena.center.lat, arena.center.lng, res);
  // centre spacing at res r is roughly 2 * edge * cos(30); 1.2 keeps the disk safely larger than the circle
  const spacing = res === 11 ? 43 : res === 10 ? 114 : res === 9 ? 300 : 800;
  const k = Math.ceil(((arena.radiusKm * 1000) / spacing) * 1.2) + 1;
  return gridDisk(origin, k).filter(c => inArena(cellCenter(c), arena));
}

/**
 * Stable per-outing trim in [150, 400) m. A fixed trim makes every visible start sit exactly trim + r from the
 * zone centre, so N outings trilaterate it; a per-outing value blurs that ring. Seeded so replays are stable.
 * shortcut: seed is only the outing id (guessable), mix in a server secret if outing ids become visible to other players.
 */
export function outingTrimM(seed: number | string): number {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return TRIM_MIN_M + (((h ^ (h >>> 16)) >>> 0) / 2 ** 32) * (TRIM_MAX_M - TRIM_MIN_M);
}

/**
 * Obfuscate a privacy zone once, at creation (u1, u2 uniform in [0, 1)).
 * The stored centre c' is the true point c moved by d = 0.5 r * sqrt(u1) at angle 2 pi u2 (uniform over a disk of
 * radius r/2), and the stored radius is r' = 1.5 r. Every point p of the original circle stays hidden:
 * |p - c'| <= |p - c| + |c - c'| <= r + r/2 = r'. r' is the same for every offset, so it leaks nothing about d.
 * An attacker who fits a circle to visible exit points recovers c', which is d from home (mean r/3, up to r/2).
 */
export function obfuscateZone(z: Zone, u1: number, u2: number): Zone {
  const d = 0.5 * z.radiusM * Math.sqrt(u1);
  const a = 2 * Math.PI * u2;
  return {
    lat: z.lat + (d * Math.sin(a)) / 111_320,
    lng: z.lng + (d * Math.cos(a)) / (111_320 * Math.cos(rad(z.lat))),
    radiusM: Math.round(z.radiusM * 1.5),
  };
}

/**
 * Per point (sorted by t): true when it is part of a stretch no runner makes (plan 5b). Judged over windows, not fix to
 * fix, so 5-20 m phone jitter at 1 Hz can't trip it:
 * - speed cap: displacement over >= CAP_WINDOW_S (or to the previous fix when sparser), minus SLACK_M of GPS error,
 *   faster than maxKmh (vehicles, teleports); every point in the window is flagged.
 * - sustained jump: speed over a +-SPEED_HALF_S window more than MAX_STEP_MS (plus a margin for the track's own
 *   estimated jitter) above the faster of the paces BASE_S before and after (walking, then a car at 20 km/h for a
 *   minute); the whole window is flagged.
 * shortcut: a fast stretch longer than ~2 BASE_S under the speed cap looks like a fast runner and is kept.
 */
export function fastPoints(pts: GpsPoint[], maxKmh = MAX_KMH): boolean[] {
  const maxMs = maxKmh / 3.6;
  const n = pts.length;
  const fast: boolean[] = new Array(n).fill(false);
  const sec = (i: number) => pts[i].t / 1000;
  const mark = (a: number, b: number) => {
    for (let k = a; k <= b; k++) fast[k] = true;
  };
  for (let i = 1, j = 0; i < n; i++) {
    while (j < i - 1 && sec(i) - sec(j + 1) >= CAP_WINDOW_S) j++;
    const d = haversineM(pts[j], pts[i]) - SLACK_M;
    const dt = sec(i) - sec(j);
    if (d > 0 && (dt <= 0 || d / dt > maxMs)) mark(j + 1, i);
  }
  const win: [number, number][] = [];
  const v = pts.map((_, i) => {
    let a = i;
    let b = i;
    while (a > 0 && sec(i) - sec(a - 1) <= SPEED_HALF_S) a--;
    while (b < n - 1 && sec(b + 1) - sec(i) <= SPEED_HALF_S) b++;
    win.push([a, b]);
    const dt = sec(b) - sec(a);
    return dt >= SPEED_HALF_S ? haversineM(pts[a], pts[b]) / dt : NaN;
  });
  // jitter estimate: |p[i-1] + p[i+1] - 2 p[i]| of 2-D noise sigma has median 2.88 sigma
  const dd = pts.slice(1, -1).map((p, k) => 2 * haversineM(p, {lat: (pts[k].lat + pts[k + 2].lat) / 2, lng: (pts[k].lng + pts[k + 2].lng) / 2}));
  const sigma = dd.length ? dd.sort((a, b) => a - b)[dd.length >> 1] / 2.88 : 0;
  // two window speeds differ by ~sigma / SPEED_HALF_S from noise alone; allow 2 of those
  const step = MAX_STEP_MS + (2 * sigma) / SPEED_HALF_S;
  const at = (i: number, ds: number) => {
    let k = i;
    while (k + Math.sign(ds) >= 0 && k + Math.sign(ds) < n && Math.abs(sec(k) - sec(i)) < Math.abs(ds)) k += Math.sign(ds);
    return Math.abs(sec(k) - sec(i)) >= Math.abs(ds) * 0.9 ? v[k] : NaN;
  };
  for (let i = 0; i < n; i++) {
    if (!(v[i] > step)) continue;
    // pace a minute before and after; the faster one is the base, so a U-turn (displacement ~0) is not a slow base
    const base = Math.max(...[at(i, -BASE_S), at(i, BASE_S)].filter(x => !Number.isNaN(x)));
    if (base > -Infinity && v[i] - base > step) mark(...win[i]);
  }
  return fast;
}

/** Default GPS measurement noise (m) for smoothTrack: typical phone fix error in the open. */
export const GPS_NOISE_M = 10;
/** White-noise acceleration (m^2/s^3) of the constant-velocity model: lets a runner turn a corner in a few seconds. */
const ACCEL_NOISE = 1;

/**
 * Constant-velocity Kalman filter + Rauch-Tung-Striebel smoother over one run of points (sorted by t), in local
 * metres around the first point. x and y are independent 1-D [position, velocity] filters. Returns smoothed lat/lng.
 */
export function smoothTrack(pts: GpsPoint[], noiseM = GPS_NOISE_M): LatLng[] {
  if (pts.length < 3 || !(noiseM > 0)) return pts.map(p => ({lat: p.lat, lng: p.lng}));
  const o = pts[0];
  const mLat = (Math.PI / 180) * R;
  const mLng = mLat * Math.cos(rad(o.lat));
  const axis = (z: number[]): number[] => {
    const r = noiseM * noiseM;
    const n = z.length;
    // filtered state/covariance (f) and one-step prediction (p) per point; P = [a b; b c]
    const f: number[][] = [];
    const p: number[][] = [];
    let [x, v, a, b, c] = [z[0], 0, r, 0, 100]; // velocity prior: 0 +- 10 m/s
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        const dt = Math.max(0, (pts[i].t - pts[i - 1].t) / 1000);
        const q = ACCEL_NOISE;
        x += v * dt;
        [a, b, c] = [a + 2 * dt * b + dt * dt * c + (q * dt ** 3) / 3, b + dt * c + (q * dt * dt) / 2, c + q * dt];
      }
      p.push([x, v, a, b, c]);
      const k0 = a / (a + r);
      const k1 = b / (a + r);
      const y = z[i] - x;
      [x, v] = [x + k0 * y, v + k1 * y];
      [a, b, c] = [(1 - k0) * a, (1 - k0) * b, c - k1 * b];
      f.push([x, v, a, b, c]);
    }
    const out = new Array<number>(n);
    let [sx, sv] = [f[n - 1][0], f[n - 1][1]];
    out[n - 1] = sx;
    for (let i = n - 2; i >= 0; i--) {
      const [fx, fv, fa, fb, fc] = f[i];
      const [px, pv, pa, pb, pc] = p[i + 1];
      const dt = Math.max(0, (pts[i + 1].t - pts[i].t) / 1000);
      // C = P_f F^T P_p^-1, with P_f F^T = [fa + dt fb, fb; fb + dt fc, fc]
      const det = pa * pc - pb * pb || 1e-9;
      const [m00, m01, m10, m11] = [fa + dt * fb, fb, fb + dt * fc, fc];
      const c00 = (m00 * pc - m01 * pb) / det;
      const c01 = (m01 * pa - m00 * pb) / det;
      const c10 = (m10 * pc - m11 * pb) / det;
      const c11 = (m11 * pa - m10 * pb) / det;
      [sx, sv] = [fx + c00 * (sx - px) + c01 * (sv - pv), fv + c10 * (sx - px) + c11 * (sv - pv)];
      out[i] = sx;
    }
    return out;
  };
  const xs = axis(pts.map(p => (p.lng - o.lng) * mLng));
  const ys = axis(pts.map(p => (p.lat - o.lat) * mLat));
  return pts.map((_, i) => ({lat: o.lat + ys[i] / mLat, lng: o.lng + xs[i] / mLng}));
}

/**
 * GPS points -> ordered trail cells.
 * Drops: points outside the arena circle, points inside a privacy zone, stretches faster than 25 km/h or
 * that jump implausibly above the pace around them (bikes, cars, GPS jumps; see fastPoints). Hides the path within trimM of the outing's
 * start/end and of every privacy-zone exit/entry, so a zone's edge is never drawn. Consecutive kept points are joined
 * with the H3 grid path so sparse GPX tracks still leave a continuous trail.
 * Each unbroken run of kept points is smoothed (smoothTrack) before cell assignment. The speed, arena and zone filters
 * judge the raw points; a smoothed point that would land in a zone or outside the arena keeps its raw position.
 * Trim distances are measured along the smoothed path, which is closer to the true distance than the jittery (longer) raw path.
 */
export function pointsToCells(points: GpsPoint[], arena: Arena, opts: TrailOptions = {}): TrailCell[] {
  const trimM = opts.trimM ?? TRIM_M;
  const zones = opts.zones ?? [];
  const pts = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  if (!pts.length) return [];

  const fast = fastPoints(pts, opts.maxKmh ?? MAX_KMH);
  const inZone = pts.map(p => zones.some(z => haversineM(p, z) <= z.radiusM));
  const ok = pts.map((p, i) => !fast[i] && inArena(p, arena) && !inZone[i]);
  const pos: LatLng[] = pts.slice();
  for (let i = 0, j = 0; i < pts.length; i = j + 1) {
    for (j = i; j < pts.length && ok[j]; j++);
    smoothTrack(pts.slice(i, j), opts.smoothM ?? GPS_NOISE_M).forEach((s, k) => {
      if (inArena(s, arena) && !zones.some(z => haversineM(s, z) <= z.radiusM)) pos[i + k] = s;
    });
  }
  // Path distance on the smoothed track: jitter inflates raw path length (~2x at 12 m noise), which would shrink the trim.
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + haversineM(pos[i - 1], pos[i]));
  // path distance since the previous / until the next zone point (or the outing's start / end)
  const since: number[] = [];
  const until: number[] = [];
  for (let i = 0, edge = 0; i < pts.length; i++) {
    if (inZone[i]) edge = cum[i];
    since.push(cum[i] - edge);
  }
  for (let i = pts.length - 1, edge = cum[pts.length - 1]; i >= 0; i--) {
    if (inZone[i]) edge = cum[i];
    until[i] = edge - cum[i];
  }

  const out: TrailCell[] = [];
  const push = (cell: string, t: number, hidden: boolean) => {
    const last = out[out.length - 1];
    if (last && last.cell === cell) {
      if (last.hidden && !hidden) last.hidden = false;
      return;
    }
    out.push(hidden ? {cell, t, hidden: true} : {cell, t});
  };

  let prev: {cell: string; t: number; hidden: boolean} | null = null;
  for (let i = 0; i < pts.length; i++) {
    if (!ok[i]) {
      prev = null;
      continue;
    }
    const p = {...pos[i], t: pts[i].t};
    const hidden = since[i] < trimM || until[i] < trimM;
    const cell = latLngToCell(p.lat, p.lng, TURF_RES);
    if (prev && prev.cell !== cell) {
      let path: string[] = [];
      try {
        path = gridPathCells(prev.cell, cell);
      } catch {
        path = [];
      }
      if (path.length > 2 && path.length <= MAX_GAP_CELLS) {
        for (let j = 1; j < path.length - 1; j++) {
          const f = j / (path.length - 1);
          push(path[j], Math.round(prev.t + (p.t - prev.t) * f), prev.hidden || hidden);
        }
      }
    }
    push(cell, p.t, hidden);
    prev = {cell, t: p.t, hidden};
  }
  return opts.keepHidden ? out : out.filter(c => !c.hidden);
}

export type LoopResult =
  | {closed: false; reason: null; loop: TrailCell[]; startIndex: number; endIndex: number}
  | {closed: true; reason: 'territory' | 'start'; loop: TrailCell[]; startIndex: number; endIndex: number};

/**
 * A trail is closed when it re-enters the player's own territory, or comes back within 50 m of where it
 * started (after having gone away from it). The trail starts at the first cell outside own territory.
 * Returns the cells of the first loop found; endIndex is the trail index that closed it.
 */
/** A paced game lets a loop count when it was run at the target pace or up to 5% slower. */
export const PACE_GRACE = 1.05;
export const fmtPace = (secPerKm: number): string => `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}`;
/**
 * How fast the stretch between two moments was run: distance along the smoothed track (so standing still with GPS
 * jitter adds time but no distance) over elapsed time. Null when there is too little to judge: under 150 m or 30 s.
 */
export function loopPace(points: GpsPoint[], fromT: number, toT: number): {km: number; secPerKm: number} | null {
  const pts = points.filter(p => p.t >= fromT && p.t <= toT);
  if (pts.length < 2) return null;
  const path = smoothTrack(pts);
  let m = 0;
  for (let i = 1; i < path.length; i++) m += haversineM(path[i - 1], path[i]);
  const sec = (pts[pts.length - 1].t - pts[0].t) / 1000;
  if (m < 150 || sec < 30) return null;
  return {km: m / 1000, secPerKm: sec / (m / 1000)};
}
export const paceOk = (secPerKm: number, target: number): boolean => secPerKm <= target * PACE_GRACE;

export function detectLoop(trail: TrailCell[], owned: ReadonlySet<string>): LoopResult {
  const startIndex = trail.findIndex(c => !owned.has(c.cell));
  if (startIndex < 0) return {closed: false, reason: null, loop: [], startIndex: trail.length, endIndex: trail.length};
  const start = cellCenter(trail[startIndex].cell);
  let away = false;
  for (let j = startIndex + 1; j < trail.length; j++) {
    const c = trail[j];
    if (owned.has(c.cell)) return {closed: true, reason: 'territory', loop: trail.slice(startIndex, j), startIndex, endIndex: j};
    const d = haversineM(start, cellCenter(c.cell));
    if (d > AWAY_M) away = true;
    else if (away && d <= CLOSE_M) return {closed: true, reason: 'start', loop: trail.slice(startIndex, j + 1), startIndex, endIndex: j};
  }
  return {closed: false, reason: null, loop: trail.slice(startIndex), startIndex, endIndex: trail.length};
}

/**
 * Every cell on the trail and inside the polygon it draws. Hidden cells (first/last 200 m) are left out,
 * so the claimed ground stops short of where the outing began and ended. Falls back to the trail itself
 * when the polygon is degenerate (out-and-back, fewer than 3 cells).
 */
export function fillLoop(trail: (TrailCell | string)[], arena?: Arena): string[] {
  const cells: string[] = [];
  const seen = new Set<string>();
  for (const c of trail) {
    const id = typeof c === 'string' ? c : c.hidden ? null : c.cell;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    cells.push(id);
  }
  if (cells.length >= 3) {
    try {
      const ring = cells.map(c => cellToLatLng(c));
      for (const c of polygonToCells(ring, TURF_RES)) {
        if (!seen.has(c)) {
          seen.add(c);
          cells.push(c);
        }
      }
    } catch {
      /* degenerate polygon: keep the trail */
    }
  }
  return arena ? cells.filter(c => inArena(cellCenter(c), arena)) : cells;
}

export type CellOwner = {owner: number; at: number};
/** Game state as the engine sees it: cells and owners, nothing else. */
export type TurfGame = {cells: Map<string, CellOwner>};

export type ClaimResult = {game: TurfGame; changed: string[]; gained: number; taken: Record<number, number>};

/** Gives `cells` to the player, including cells other players owned. Returns a new game (input untouched). */
export function applyClaim(game: TurfGame, playerId: number, cells: string[], at: number): ClaimResult {
  const next = new Map(game.cells);
  const changed: string[] = [];
  const taken: Record<number, number> = {};
  for (const cell of new Set(cells)) {
    const cur = next.get(cell);
    if (cur?.owner === playerId) continue;
    if (cur) taken[cur.owner] = (taken[cur.owner] ?? 0) + 1;
    next.set(cell, {owner: playerId, at});
    changed.push(cell);
  }
  return {game: {cells: next}, changed, gained: changed.length, taken};
}

/** A player leaving turns their cells neutral. */
export function releasePlayer(game: TurfGame, playerId: number): TurfGame {
  const next = new Map<string, CellOwner>();
  for (const [cell, o] of game.cells) if (o.owner !== playerId) next.set(cell, o);
  return {cells: next};
}

export type OutingTrail = {userId: number; trail: TrailCell[]; endedAt?: number | null};
export type Cut = {cell: string; t: number; victimId: number; cutterId: number};

/**
 * Did `cutter` run across `victim`'s open trail? Judged from cells and timestamps only: the cutter must be
 * on a cell the victim had already laid, while the victim's outing was still going. The victim's hidden
 * cells can't be cut (they are never part of the game). A cut outing claims nothing.
 */
export function detectCut(victim: OutingTrail, cutter: OutingTrail): Cut | null {
  if (victim.userId === cutter.userId) return null;
  const laid = new Map<string, number>();
  for (const c of victim.trail) {
    if (c.hidden) continue;
    const t = laid.get(c.cell);
    if (t == null || c.t < t) laid.set(c.cell, c.t);
  }
  let best: Cut | null = null;
  for (const c of cutter.trail) {
    const t = laid.get(c.cell);
    if (t == null || c.t < t) continue;
    if (victim.endedAt != null && c.t > victim.endedAt) continue;
    if (!best || c.t < best.t) best = {cell: c.cell, t: c.t, victimId: victim.userId, cutterId: cutter.userId};
  }
  return best;
}

export type Standing = {playerId: number; cells: number; reachedAt: number; rank: number};

/**
 * Most cells wins. A tie goes to whoever reached that count first: reachedAt is the time of the player's
 * latest claim among the cells they still hold. Players with no cells are listed last.
 */
export function score(game: TurfGame, playerIds: number[] = []): Standing[] {
  const by = new Map<number, {cells: number; reachedAt: number}>();
  for (const id of playerIds) by.set(id, {cells: 0, reachedAt: 0});
  for (const o of game.cells.values()) {
    const s = by.get(o.owner) ?? {cells: 0, reachedAt: 0};
    s.cells += 1;
    if (o.at > s.reachedAt) s.reachedAt = o.at;
    by.set(o.owner, s);
  }
  return [...by.entries()]
    .map(([playerId, s]) => ({playerId, ...s}))
    .sort((a, b) => b.cells - a.cells || a.reachedAt - b.reachedAt || a.playerId - b.playerId)
    .map((s, i) => ({...s, rank: i + 1}));
}
