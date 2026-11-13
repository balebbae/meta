/**
 * World pieces in the pixel style: castles, modular walls, towers, gates, props, plants and terrain tiles.
 * Pivots the animator drives: `lid` (chest), `flag` (banner), `bridge` (drawbridge). Tiles are CELL (1 m, 16 px) square with their top at y = 0.
 * Sizes and positions are in px (soft.ts); prop heights are passed in px.
 */
import {Group, Mesh, Object3D, type Material} from 'three';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import {rng} from '../rng';
import type {AnimState, Rig} from '../types';
import {PX, box, decal, piv, softMaterial, steps} from './soft';

export const TILE = 12, CELL = 1;
const M = softMaterial;
const prop = (group: Group, heightPx: number, states: AnimState[] = ['idle']): Rig => {
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const rig = makeRig(group, 'prop', pivots, heightPx * PX, states); rig.dispose = () => { group.removeFromParent(); }; return rig;
};
/** A 1 px pole with a w px pennant, standing on y. */
const flagOn = (parent: Object3D, x: number, y: number, z: number, color: number, w = 3): void => { box(parent, M('wood', C.woodDark), 1, w + 2, 1, x, y + (w + 2) / 2, z); box(parent, M('cloth', color), w, w - 1, 0.5, x + 0.5 + w / 2, y + (w + 5) / 2, z); };
/** Merlons: 2 px cubes every 4 px along a top edge. */
const crenels = (parent: Object3D, m: Material, x0: number, x1: number, y: number, z: number): void => { for (let x = x0; x <= x1; x += 4) box(parent, m, 2, 2, 2, x, y + 1, z); };
const windowOn = (parent: Object3D, x: number, y: number, z: number): void => { decal(parent, M('flat', C.blueDark), 2, 3, x, y, z); };
/** A square tower: shaft, lip, eight merlons and a stepped roof. Returns the roof's top y. */
export function tower(parent: Object3D, x: number, z: number, h: number, side: number, stone: Material, roof: Material, knob: Material, flag?: number): number {
  const e = side / 2; box(parent, stone, side, h, side, x, h / 2, z); box(parent, stone, side + 2, 2, side + 2, x, h + 1, z);
  for (const [dx, dz] of [[-e, -e], [0, -e], [e, -e], [-e, 0], [e, 0], [-e, e], [0, e], [e, e]]) box(parent, stone, 2, 2, 2, x + dx, h + 3, z + dz);
  const top = steps(parent, roof, side - 2, 3, x, h + 2, z); box(parent, knob, 2, 2, 2, x, top + 1, z);
  windowOn(parent, x, Math.round(h * 0.6), z + e); if (flag !== undefined) flagOn(parent, x, top + 2, z, flag);
  return top;
}

export function buildCastle(kind: 'starter' | 'royal'): Rig {
  const royal = kind === 'royal', g = new Group(); g.name = `castle:${kind}`;
  const stone = M('stone', royal ? C.ivory : C.stoneLight), dark = M('stone', royal ? C.stoneLight : C.stone), roof = M('cloth', royal ? C.pink : C.blue), knob = M('gold', royal ? C.gold : C.blueDark), gold = M('gold', C.gold);
  const W = royal ? 36 : 28, H = royal ? 24 : 20, D = royal ? 24 : 20, th = royal ? 34 : 26, ts = royal ? 12 : 10, R = royal ? 10 : 6;
  box(g, stone, W, H, D, 0, H / 2, 0);
  for (const s of [-1, 1]) crenels(g, dark, -R, R, H, s * (D / 2 - 1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(g, sx * (W / 2), sz * (D / 2), th, ts, stone, roof, knob, sz > 0 ? (royal ? C.pink : C.blue) : undefined);
  // central keep with the tallest roof
  const kw = W / 2, kh = royal ? 16 : 14; box(g, stone, kw, kh, kw, 0, H + kh / 2, -2);
  const top = steps(g, roof, kw + 2, 2, 0, H + kh, -2); box(g, knob, 2, 2, 2, 0, top + 1, -2); flagOn(g, 0, top + 2, -2, royal ? C.gold : C.crimson, 4);
  // gate: dark arch, wooden door, two banners
  const gw = royal ? 10 : 8, gh = royal ? 12 : 10, f = D / 2;
  decal(g, M('flat', C.blueDark), gw, gh, 0, gh / 2, f); box(g, M('wood', C.wood), gw - 2, gh - 2, 0.5, 0, (gh - 2) / 2, f + 0.4);
  for (const s of [-1, 1]) { box(g, M('cloth', royal ? C.gold : C.crimson), 2, 6, 0.5, s * (gw / 2 + 3), gh - 2, f + 0.3); decal(g, royal ? M('gold', C.crimson) : gold, 1, 1, s * (gw / 2 + 3), gh - 0.5, f + 0.6); }
  for (const s of [-1, 1]) windowOn(g, s * (W / 2 - ts / 2 - 2), H - 5, f); windowOn(g, 0, H + Math.round(kh * 0.55), -2 + kw / 2);
  if (royal) for (const s of [-1, 1]) box(g, gold, 1, gh + 2, 1, s * (gw / 2 + 0.5), (gh + 2) / 2, f + 0.5);
  return prop(g, top + 7);
}
export function buildWall(): Rig { const g = new Group(); box(g, M('stone', C.stoneLight), 16, 9, 4, 0, 4.5, 0); crenels(g, M('stone', C.stone), -6, 6, 9, 0); return prop(g, 11); }
export function buildTower(): Rig { const g = new Group(); return prop(g, tower(g, 0, 0, 22, 10, M('stone', C.stoneLight), M('cloth', C.blue), M('gold', C.gold), C.blue) + 7); }
export function buildGate(): Rig {
  const g = new Group(), m = M('stone', C.stoneLight); box(g, m, 20, 15, 5, 0, 7.5, 0);
  box(g, M('flat', C.blueDark), 8, 11, 6, 0, 5.5, 0); crenels(g, M('stone', C.stone), -8, 8, 15, 0);
  for (const s of [-1, 1]) { box(g, m, 4, 17, 6, s * 12, 8.5, 0); box(g, m, 6, 2, 8, s * 12, 18, 0); }
  return prop(g, 19);
}
export function buildDrawbridge(): Rig {
  const g = new Group(), wood = M('wood', C.wood); for (const s of [-1, 1]) { box(g, M('stone', C.stoneLight), 2, 14, 2, s * 6, 7, -1); box(g, M('stone', C.stone), 3, 1, 3, s * 6, 14.5, -1); }
  const bridge = piv('bridge', g, 0, 0.5, 0); bridge.rotation.x = -1.45; box(bridge, wood, 10, 1, 14, 0, 0, 7); for (let i = 0; i < 4; i++) box(bridge, M('wood', C.woodDark), 10, 0.4, 1, 0, 0.7, 2 + i * 3.5);
  for (const s of [-1, 1]) box(bridge, M('metal', C.ironDark), 0.5, 13, 0.5, s * 4.5, 8, 2).rotation.x = 0.35;
  return prop(g, 16, ['idle', 'celebrate']);
}
export function buildFence(): Rig { const g = new Group(), dark = M('wood', C.woodDark); for (const x of [-7, -2.5, 2.5, 7]) box(g, M('wood', C.wood), 1, 6, 1, x, 3, 0); box(g, dark, 16, 1, 0.5, 0, 2.5, 0); box(g, dark, 16, 1, 0.5, 0, 4.5, 0); return prop(g, 6); }
export function buildTent(color: number = C.crimson): Rig {
  const g = new Group(), mid = steps(g, M('cloth', C.ivory), 14, 2, 0, 0, 0, 8), top = steps(g, M('cloth', color), 6, 2, 0, mid, 0);
  box(g, M('gold', C.gold), 1, 1, 1, 0, top + 0.5, 0); box(g, M('flat', C.blueDark), 3, 4, 2, 0, 2, 6.1); flagOn(g, 0, top + 1, 0, color);
  return prop(g, top + 6);
}
export function buildChest(): Rig {
  const g = new Group(), gold = M('gold', C.gold); box(g, M('wood', C.wood), 8, 5, 6, 0, 2.5, 0);
  for (const x of [-2.5, 2.5]) box(g, gold, 1, 5, 7, x, 2.5, 0);
  const lid = piv('lid', g, 0, 5, -3); box(lid, M('wood', shade(C.wood, 1.1)), 8, 2, 6, 0, 1, 3); for (const x of [-2.5, 2.5]) box(lid, gold, 1, 2.4, 7, x, 1.2, 3);
  box(g, gold, 2, 2, 0.6, 0, 4.5, 3.3); return prop(g, 7, ['idle', 'celebrate']);
}
export function buildBanner(color: number = C.crimson, mark: number = C.gold): Rig {
  const g = new Group(); box(g, M('wood', C.woodDark), 1, 20, 1, 0, 10, 0); box(g, M('gold', mark), 2, 2, 2, 0, 21, 0);
  const flag = piv('flag', g, 0, 19, 0); box(flag, M('cloth', color), 8, 10, 0.5, 4.5, -5, 0); box(flag, M('gold', mark), 3, 3, 0.8, 4.5, -5, 0);
  return prop(g, 22);
}
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
export function buildTree(kind: 'round' | 'pink' | 'pine' = 'round', seed = 1): Rig {
  const g = new Group(), r = rng(seed); box(g, M('wood', C.woodDark), 2, 7, 2, 0, 3.5, 0);
  if (kind === 'pine') { // a spruce: alternating wide and narrow layers
    [[12, 6], [8, 8], [10, 10], [6, 12], [8, 14], [4, 16], [2, 18]].forEach(([side, y], i) => box(g, M('leaf', i < 5 ? C.greenDark : C.green), side, 2, side, 0, y + 1, 0));
    return prop(g, 20);
  }
  const m = M('leaf', kind === 'pink' ? C.pink : C.green), m2 = M('leaf', kind === 'pink' ? C.pinkDark : C.greenDark);
  box(g, m2, 12, 10, 12, 0, 12, 0); box(g, m, 8, 6, 8, 0, 17, 0);
  for (const [dx, dz] of SIDES) { const slide = Math.round(r() * 4 - 2); box(g, m, 6, 6, 6, dx * 5 + Math.abs(dz) * slide, 11 + Math.floor(r() * 3), dz * 5 + Math.abs(dx) * slide); } // lobes poke 2 px out of each side
  return prop(g, 20);
}
export function buildShrub(seed = 2): Rig { const g = new Group(), r = rng(seed); box(g, M('leaf', C.greenDark), 8, 6, 8, 0, 3, 0); for (const [dx, dz] of SIDES.slice(0, 3)) { const slide = Math.round(r() * 2 - 1); box(g, M('leaf', C.green), 4, 4, 4, dx * 4 + Math.abs(dz) * slide, 3, dz * 4 + Math.abs(dx) * slide); } return prop(g, 6); }
export function buildRock(seed = 3): Rig { const g = new Group(), r = rng(seed); box(g, M('rock', C.stone), 10, 7, 9, 0, 3.5, 0); box(g, M('rock', C.stoneDark), 6, 5, 6, 4 + Math.round(r()), 2.5, 2); box(g, M('grass', C.moss), 6, 1, 5, -2, 7.5, -2); return prop(g, 8); }
export function buildSteppingStone(): Rig { const g = new Group(); box(g, M('rock', C.stoneLight), 7, 1, 6, 0, 0.5, 0); return prop(g, 1); }
export function buildHedge(): Rig { const g = new Group(); box(g, M('leaf', C.greenDark), 8, 6, 5, 0, 3, 0); for (const [x, z] of [[-2.5, -1], [1, 1]]) box(g, M('leaf', C.green), 3, 2, 3, x, 7, z); return prop(g, 8); }
export function buildTile(kind: 'grass' | 'sand' | 'water' | 'path' | 'flowers', seed = 4): Rig {
  const g = new Group(), r = rng(seed);
  box(g, kind === 'water' ? M('water', C.water) : kind === 'sand' ? M('sand', C.sand) : kind === 'path' ? M('rock', C.stoneLight) : M('grass', C.grass), 16, 2, 16, 0, -1, 0);
  if (kind === 'flowers') for (let i = 0; i < 5; i++) box(g, M('cloth', [C.pink, C.white, C.gold][i % 3]), 1, 1, 1, Math.round((r() - 0.5) * 12) + 0.5, 0.5, Math.round((r() - 0.5) * 12) + 0.5);
  return prop(g, 1);
}
