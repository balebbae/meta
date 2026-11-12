/**
 * Turf engine (spec §10.3, §7.4). Pure and deterministic: no DB, no clock, no network.
 * GPS points go in, H3 cells come out. Routes and positions never leave this module's inputs;
 * game state is only ever cells and owners.
 */
import {cellToLatLng, gridDisk, gridPathCells, latLngToCell, polygonToCells} from 'h3-js';

export const TURF_RES = 11;
export const TRIM_M = 200;
export const MAX_KMH = 25;
export const CLOSE_M = 50;
const AWAY_M = 120;
const MAX_GAP_CELLS = 8;

export type LatLng = {lat: number; lng: number};
/** t = epoch milliseconds. */
export type GpsPoint = LatLng & {t: number};
export type Arena = {center: LatLng; radiusKm: number};
export type Zone = LatLng & {radiusM: number};
/** hidden = inside the first/last 200 m of the outing: usable for closing a loop, never claimed or shown. */
export type TrailCell = {cell: string; t: number; hidden?: boolean};

export type TrailOptions = {
  zones?: Zone[];
  trimM?: number;
  maxKmh?: number;
  /** Return hidden cells too (flagged). Server-only bookkeeping; the default drops them. */
  keepHidden?: boolean;
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
 * GPS points -> ordered trail cells.
 * Drops: points outside the arena circle, points inside a privacy zone, stretches faster than 25 km/h
 * (bikes, cars, GPS jumps). Hides the first and last 200 m of path. Consecutive kept points are joined
 * with the H3 grid path so sparse GPX tracks still leave a continuous trail.
 */
export function pointsToCells(points: GpsPoint[], arena: Arena, opts: TrailOptions = {}): TrailCell[] {
  const trimM = opts.trimM ?? TRIM_M;
  const maxMs = ((opts.maxKmh ?? MAX_KMH) * 1000) / 3600;
  const zones = opts.zones ?? [];
  const pts = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  if (!pts.length) return [];

  const cum: number[] = [0];
  const fast: boolean[] = [false];
  for (let i = 1; i < pts.length; i++) {
    const d = haversineM(pts[i - 1], pts[i]);
    const dt = (pts[i].t - pts[i - 1].t) / 1000;
    cum.push(cum[i - 1] + d);
    fast.push(d > 0 && (dt <= 0 || d / dt > maxMs));
  }
  const total = cum[cum.length - 1];

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
    const p = pts[i];
    const ok = !fast[i] && inArena(p, arena) && !zones.some(z => haversineM(p, z) <= z.radiusM);
    if (!ok) {
      prev = null;
      continue;
    }
    const hidden = cum[i] < trimM || total - cum[i] < trimM;
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
