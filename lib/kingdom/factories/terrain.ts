/** A game board from a character map: one merged mesh per surface kind (grass, path, sand, water, hedge, flowers), so a whole board is a handful of draw calls. Tiles are 16 px blocks. */
import {BufferGeometry, Group, Object3D} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {C} from '../palette';
import {makeRig} from '../rig';
import {rng} from '../rng';
import type {Rig} from '../types';
import {PX, mesh, pxGeometry, softMaterial} from './soft';
import {CELL} from './world';

export type TerrainKind = 'grass' | 'flowers' | 'path' | 'sand' | 'water' | 'hedge' | 'none';
export {CELL};
const MATS: Record<string, () => ReturnType<typeof softMaterial>> = {
  grass: () => softMaterial('grass', C.grass), path: () => softMaterial('rock', C.stoneLight), sand: () => softMaterial('sand', C.sand), water: () => softMaterial('water', C.water),
  hedge: () => softMaterial('leaf', C.greenDark), flower: () => softMaterial('cloth', C.pink),
};

export function buildTerrain(rows: readonly string[], legend: Record<string, TerrainKind>, seed = 1): Rig {
  const r = rng(seed), w = rows[0].length, h = rows.length, parts = new Map<string, BufferGeometry[]>();
  const add = (key: string, g: BufferGeometry) => { let list = parts.get(key); if (!list) { list = []; parts.set(key, list); } list.push(g); };
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const kind = legend[rows[cy][cx]] ?? 'grass'; if (kind === 'none') continue;
    const [wx, wz] = cellToWorld(cx, cy, w, h), surface = kind === 'flowers' || kind === 'hedge' ? 'grass' : kind, tile = cx * 7 + cy * 13; // each tile starts its pattern somewhere else
    add(surface, pxGeometry(16, 2, 16, tile).translate(wx, -PX, wz));
    if (kind === 'hedge') add('hedge', pxGeometry(14, 9, 14, tile).translate(wx, 4.5 * PX, wz));
    if (kind === 'flowers') for (let i = 0; i < 3; i++) add('flower', pxGeometry(1, 1, 1).translate(wx + (Math.round((r() - 0.5) * 12) + 0.5) * PX, 0.5 * PX, wz + (Math.round((r() - 0.5) * 12) + 0.5) * PX));
  }
  const group = new Group(); group.name = 'terrain';
  for (const [key, list] of parts) { const merged = mergeGeometries(list, false); for (const g of list) g.dispose(); if (merged) group.add(mesh(merged, MATS[key]())); }
  const pivots: Record<string, Object3D> = {};
  const rig = makeRig(group, 'prop', pivots, 0.6, ['idle']);
  rig.dispose = () => { group.removeFromParent(); group.traverse((o) => { const m = o as {isMesh?: boolean; geometry?: BufferGeometry}; if (m.isMesh) m.geometry?.dispose(); }); };
  return rig;
}
/** World position of a cell's centre on a terrain built from `rows`. */
export function cellToWorld(cx: number, cy: number, w: number, h: number): [number, number] { return [(cx - w / 2 + 0.5) * CELL, (cy - h / 2 + 0.5) * CELL]; }
