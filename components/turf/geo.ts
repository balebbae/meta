import {cellToBoundary} from 'h3-js';
import type {Arena, LatLng} from '@/lib/turf/engine';

const M_PER_DEG = 111_320;

/** Equirectangular projection around the arena centre, in metres (x east, y south, so it maps straight onto SVG). */
export function project(arena: Arena, p: LatLng): [number, number] {
  const k = Math.cos((arena.center.lat * Math.PI) / 180);
  return [(p.lng - arena.center.lng) * M_PER_DEG * k, -(p.lat - arena.center.lat) * M_PER_DEG];
}

export function unproject(arena: Arena, x: number, y: number): LatLng {
  const k = Math.cos((arena.center.lat * Math.PI) / 180);
  return {lat: arena.center.lat - y / M_PER_DEG, lng: arena.center.lng + x / (M_PER_DEG * k)};
}

/** One SVG path for a set of H3 cells. */
export function cellsPath(arena: Arena, cells: Iterable<string>): string {
  let d = '';
  for (const cell of cells) {
    let ring: [number, number][];
    try {
      ring = cellToBoundary(cell) as [number, number][];
    } catch {
      continue;
    }
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project(arena, {lat: ring[i][0], lng: ring[i][1]});
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += 'Z';
  }
  return d;
}

export function viewBox(arena: Arena): string {
  const r = arena.radiusKm * 1000 * 1.04;
  return `${-r} ${-r} ${2 * r} ${2 * r}`;
}
