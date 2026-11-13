import {cellsToMultiPolygon} from 'h3-js';
import type {Arena} from '@/lib/turf/engine';

const M_PER_DEG = 111_320;

/** H3 cells as one GeoJSON MultiPolygon, [lng, lat] order. */
export function cellsGeometry(cells: string[]): GeoJSON.MultiPolygon {
  const coordinates: GeoJSON.Position[][][] = [];
  for (const cell of cells) {
    try {
      coordinates.push(...cellsToMultiPolygon([cell], true));
    } catch {
      continue;
    }
  }
  return {type: 'MultiPolygon', coordinates};
}

/** The arena circle as a closed [lng, lat] ring. */
export function arenaRing(arena: Arena, steps = 72): GeoJSON.Position[] {
  const k = Math.cos((arena.center.lat * Math.PI) / 180);
  const r = arena.radiusKm * 1000;
  return Array.from({length: steps + 1}, (_, i) => {
    const a = (i / steps) * 2 * Math.PI;
    return [arena.center.lng + (r * Math.sin(a)) / (M_PER_DEG * k), arena.center.lat + (r * Math.cos(a)) / M_PER_DEG];
  });
}

/** [[west, south], [east, north]] around the arena, with a small margin. */
export function arenaBounds(arena: Arena): [[number, number], [number, number]] {
  const k = Math.cos((arena.center.lat * Math.PI) / 180);
  const r = arena.radiusKm * 1000 * 1.04;
  const dLat = r / M_PER_DEG;
  const dLng = r / (M_PER_DEG * k);
  return [
    [arena.center.lng - dLng, arena.center.lat - dLat],
    [arena.center.lng + dLng, arena.center.lat + dLat],
  ];
}
