/** One merged terrain mesh from a character map: a few draw calls for a whole game board instead of one tile rig per cell. */
import {Group, Object3D} from 'three';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import {rng} from '../rng';
import type {Rig} from '../types';
import {VOXEL, Vox, meshPart} from '../voxel';
import {TILE} from './world';

export type TerrainKind = 'grass' | 'flowers' | 'path' | 'sand' | 'water' | 'hedge' | 'none';
export const CELL = TILE * VOXEL;

export function buildTerrain(rows: readonly string[], legend: Record<string, TerrainKind>, seed = 1): Rig {
  const v = new Vox(), r = rng(seed), w = rows[0].length, h = rows.length, half = TILE / 2;
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const kind = legend[rows[cy][cx]] ?? 'grass'; if (kind === 'none') continue;
    const ox = (cx - w / 2) * TILE, oz = (cy - h / 2) * TILE;
    for (let x = 0; x < TILE; x++) for (let z = 0; z < TILE; z++) {
      const X = ox + x, Z = oz + z;
      v.set(X, -2, Z, C.dirt, 'dirt');
      if (kind === 'water') v.set(X, -1, Z, r() < 0.12 ? C.waterDeep : C.water, 'water');
      else if (kind === 'sand') v.set(X, -1, Z, r() < 0.1 ? shade(C.sand, 0.93) : C.sand, 'sand');
      else if (kind === 'path') v.set(X, -1, Z, (x + z) % 2 ? C.stoneLight : C.stone, 'stone');
      else { v.set(X, -1, Z, r() < 0.15 ? C.grassDark : C.grass, 'grass'); if (kind === 'flowers' && r() < 0.05) { v.set(X, 0, Z, [C.pink, C.white, C.gold][Math.floor(r() * 3)], 'cloth'); } }
      if (kind === 'hedge' && x >= 1 && x < TILE - 1 && z >= 1 && z < TILE - 1) { for (let y = 0; y <= 7; y++) v.set(X, y, Z, y === 7 && r() < 0.3 ? C.leafLight : r() < 0.2 ? C.greenDark : C.green, 'leaf'); }
    }
    void half;
  }
  const group = new Group(); group.name = 'terrain'; group.position.y = VOXEL / 2;
  group.add(meshPart(v, [0, 0, 0], 'terrain'));
  const pivots: Record<string, Object3D> = {};
  return makeRig(group, 'prop', pivots, 8 * VOXEL, ['idle']);
}
/** World position of a cell's centre on a terrain built from `rows`. */
export function cellToWorld(cx: number, cy: number, w: number, h: number): [number, number] { return [(cx - w / 2 + 0.5) * CELL, (cy - h / 2 + 0.5) * CELL]; }
