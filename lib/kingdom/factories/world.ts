/**
 * World assets: castles, modular fortifications, tournament pieces, chest, banners, plants, rocks and terrain tiles.
 * Every piece is a Rig with species 'prop'; animated ones expose pivots: chest 'lid', banner 'flag', drawbridge 'bridge'.
 * Terrain tiles are TILE voxels square with their top surface at y = 0 so characters stand on them.
 */
import {Group, Object3D} from 'three';
import {C, shade} from '../palette';
import {rng} from '../rng';
import {makeRig} from '../rig';
import type {Rig} from '../types';
import {VOXEL, Vox, meshPart} from '../voxel';

export const TILE = 12;
const piv = (name: string, parent: Object3D, x: number, y: number, z: number) => { const o = new Object3D(); o.name = name; o.position.set(x * VOXEL, y * VOXEL, z * VOXEL); parent.add(o); return o; };
function prop(name: string, parts: Vox | Group, heightVox: number, states: Rig['states'] = ['idle']): Rig {
  const group = new Group(); group.name = name; group.position.y = VOXEL / 2;
  group.add(parts instanceof Vox ? meshPart(parts, [0, 0, 0], name) : parts);
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as unknown as {isMesh?: boolean}).isMesh) pivots[o.name] = o; });
  return makeRig(group, 'prop', pivots, heightVox * VOXEL, states);
}

/* ---------- masonry helpers ---------- */
function masonry(v: Vox, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, stone: number, seed: number): void {
  const r = rng(seed);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    const course = (y % 2 === 0 ? (x + z) : (x + z + 1)) % 3 === 0 && edge;
    v.set(x, y, z, course ? shade(stone, 0.9) : r() < 0.08 ? shade(stone, 1.06) : stone, 'stone');
  }
}
function crenels(v: Vox, x0: number, z0: number, x1: number, z1: number, y: number, stone: number): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x === x0 || x === x1 || z === z0 || z === z1) && (x + z) % 2 === 0) v.set(x, y, z, stone, 'stone');
}
function roofCone(v: Vox, cx: number, cz: number, r: number, y0: number, c: number, c2: number): void {
  for (let i = 0; i <= r + 1; i++) v.cylY(cx, cz, Math.max(r - i + 0.4, 0.3), y0 + i, y0 + i, i % 2 ? c2 : c, 'cloth');
  v.box(cx, y0 + r + 2, cz, cx, y0 + r + 4, cz, C.woodDark, 'wood'); v.box(cx + 1, y0 + r + 3, cz, cx + 2, y0 + r + 4, cz, c, 'cloth');
}
function windows(v: Vox, list: [number, number, number][], dark: number = C.blueDark): void { for (const [x, y, z] of list) { v.set(x, y, z, dark, 'glow'); v.set(x, y + 1, z, dark, 'glow'); } }

/* ---------- castles ---------- */
export function buildCastle(kind: 'starter' | 'royal'): Rig {
  const royal = kind === 'royal', stone = royal ? C.ivory : C.stoneLight, dark = royal ? C.cream : C.stone, roof = royal ? C.pink : C.blue, roof2 = royal ? C.pinkDark : C.blueDark, flag = royal ? C.gold : C.crimson;
  const v = new Vox();
  const w = royal ? 11 : 9, d = royal ? 7 : 6, h = royal ? 8 : 7;
  masonry(v, -w, 0, -d, w, h, d, stone, 3); crenels(v, -w, -d, w, d, h + 1, stone);
  const kw = royal ? 5 : 4, kh = royal ? 14 : 12;
  masonry(v, -kw, 0, -kw, kw, kh, kw, stone, 4); crenels(v, -kw, -kw, kw, kw, kh + 1, dark); roofCone(v, 0, 0, kw + 1, kh + 1, roof, roof2);
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) { v.cylY(x, z, 2.6, 0, h + 3, stone, 'stone'); v.cylY(x, z, 3, h + 3, h + 4, dark, 'stone'); roofCone(v, x, z, 3, h + 5, roof, roof2); windows(v, [[x, 4, z + 3], [x, 8, z + 3]]); }
  if (royal) { for (const [x, z] of [[-w, 0], [w, 0]]) { v.cylY(x, z, 2.2, 0, h + 5, stone, 'stone'); roofCone(v, x, z, 2.6, h + 6, roof, roof2); } }
  // gate with arch and portcullis
  v.box(-2, 0, d, 2, 5, d + 1, C.woodDark, 'wood'); v.box(-1, 6, d, 1, 6, d + 1, C.woodDark, 'wood'); v.box(-1, 1, d + 1, 1, 4, d + 1, C.wood, 'wood'); for (let y = 1; y <= 5; y += 2) v.box(-1, y, d + 1, 1, y, d + 1, C.ironDark, 'metal');
  windows(v, [[-6, 4, d], [6, 4, d], [-2, kh - 4, kw], [2, kh - 4, kw], [0, kh - 6, kw], [-6, 4, -d], [6, 4, -d]], royal ? C.purpleDark : C.blueDark);
  // banners on the front wall
  for (const x of [-4, 4]) { v.box(x, 2, d + 1, x, 5, d + 1, flag, 'cloth'); v.box(x, 3, d + 1, x, 3, d + 1, royal ? C.pinkDark : C.gold, 'cloth'); v.box(x, 6, d + 1, x, 6, d + 1, C.gold, 'gold'); }
  if (royal) { for (let x = -w + 1; x <= w - 1; x += 3) v.box(x, h, d + 1, x, h, d + 1, C.pink, 'cloth'); v.box(-3, 0, d + 2, 3, 0, d + 4, C.sand, 'sand'); }
  v.jitter(5, 0.025, ['stone']);
  return prop(`castle:${kind}`, v, kh + kw + 6);
}

/* ---------- modular fortifications ---------- */
export function buildWall(len = 12): Rig { const v = new Vox(); masonry(v, 0, 0, -1, len - 1, 6, 1, C.stoneLight, 21); crenels(v, 0, -1, len - 1, 1, 7, C.stoneLight); v.box(0, 5, 2, len - 1, 5, 2, C.stone, 'stone'); return prop('wall', v, 8); }
export function buildTower(): Rig { const v = new Vox(); v.cylY(0, 0, 3.2, 0, 11, C.stoneLight, 'stone'); v.cylY(0, 0, 3.6, 11, 12, C.stone, 'stone'); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; v.set(Math.round(Math.sin(a) * 3.3), 13, Math.round(Math.cos(a) * 3.3), C.stoneLight, 'stone'); } roofCone(v, 0, 0, 4, 13, C.blue, C.blueDark); windows(v, [[0, 4, 3], [0, 8, 3]]); v.box(0, 0, 3, 0, 2, 3, C.woodDark, 'wood'); v.jitter(22, 0.025, ['stone']); return prop('tower', v, 20); }
export function buildGate(): Rig { const v = new Vox(); masonry(v, -5, 0, -1, 5, 9, 1, C.stoneLight, 23); crenels(v, -5, -1, 5, 1, 10, C.stoneLight); for (let y = 0; y <= 6; y++) for (let x = -2; x <= 2; x++) if (!(y === 6 && Math.abs(x) === 2)) { v.del(x, y, -1); v.del(x, y, 0); v.del(x, y, 1); } for (let y = 0; y <= 6; y += 2) v.box(-2, y, 0, 2, y, 0, C.ironDark, 'metal'); v.box(0, 0, 0, 0, 6, 0, C.ironDark, 'metal'); v.box(-2, 7, 2, 2, 7, 2, C.crimson, 'cloth'); return prop('gate', v, 11); }
export function buildDrawbridge(): Rig {
  const g = new Group(); const base = new Vox(); masonry(base, -4, 0, -2, 4, 2, 0, C.stoneLight, 24); base.box(-3, 0, 0, 3, 0, 1, C.stone, 'stone'); g.add(meshPart(base, [0, 0, 0], 'bridgeBase'));
  const hinge = piv('bridge', g, 0, 3, 1); const bv = new Vox(); for (let z = 0; z < 10; z++) bv.box(-3, 0, z, 3, 0, z, z % 2 ? C.wood : shade(C.wood, 0.9), 'wood'); bv.box(-3, 1, 0, -3, 1, 9, C.woodDark, 'wood'); bv.box(3, 1, 0, 3, 1, 9, C.woodDark, 'wood'); for (const x of [-3, 3]) { bv.box(x, 2, 9, x, 2, 9, C.ironDark, 'metal'); } hinge.add(meshPart(bv, [0, 0, 0], 'bridgeDeck')); hinge.rotation.x = -1.45;
  return prop('drawbridge', g, 12, ['idle', 'celebrate']);
}

/* ---------- tournament ---------- */
export function buildFence(len = 12): Rig { const v = new Vox(); for (let i = 0; i <= len; i += 3) v.box(i, 0, 0, i, 3, 0, C.wood, 'wood'); v.box(0, 1, 0, len, 1, 0, C.woodDark, 'wood'); v.box(0, 3, 0, len, 3, 0, C.woodDark, 'wood'); return prop('fence', v, 4); }
export function buildTent(color: number = C.crimson): Rig { const v = new Vox(); v.box(-3, 0, -3, 3, 3, 3, C.ivory, 'cloth'); for (let i = 0; i < 5; i++) v.box(-3 + i, 4 + i, -3 + i, 3 - i, 4 + i, 3 - i, i % 2 ? C.ivory : color, 'cloth'); v.box(0, 9, 0, 0, 10, 0, C.woodDark, 'wood'); v.box(1, 10, 0, 1, 10, 0, color, 'cloth'); v.box(-1, 1, 3, 1, 3, 3, shade(color, 0.6), 'cloth'); v.box(0, 2, 3, 0, 2, 3, C.gold, 'gold'); return prop('tent', v, 11); }

/* ---------- chest, banners ---------- */
export function buildChest(): Rig {
  const g = new Group(); const b = new Vox(); b.box(-3, 0, -2, 3, 2, 2, C.wood, 'wood'); b.box(-2, 0, 2, -2, 2, 2, C.gold, 'gold'); b.box(2, 0, 2, 2, 2, 2, C.gold, 'gold'); b.box(-2, 2, -1, 2, 2, 1, C.gold, 'gold'); b.box(-1, 2, 0, 1, 2, 1, C.flameCore, 'glow'); b.box(0, 3, 0, 0, 3, 0, C.pink, 'glow'); g.add(meshPart(b, [0, 0, 0], 'chestBase'));
  const lid = piv('lid', g, 0, 3, -2); const lv = new Vox(); lv.box(-3, 0, 0, 3, 0, 4, C.wood, 'wood'); lv.box(-3, 1, 1, 3, 1, 3, C.wood, 'wood'); lv.box(-2, 0, 0, -2, 1, 4, C.gold, 'gold'); lv.box(2, 0, 0, 2, 1, 4, C.gold, 'gold'); lv.box(0, 0, 4, 0, 0, 4, C.gold, 'gold'); lid.add(meshPart(lv, [0, 0, 0], 'chestLid'));
  return prop('chest', g, 6, ['idle', 'celebrate']);
}
export function buildBanner(color: number = C.crimson, mark: number = C.gold): Rig {
  const g = new Group(); const pole = new Vox(); pole.box(0, 0, 0, 0, 9, 0, C.woodDark, 'wood'); pole.box(0, 10, -1, 0, 10, 1, C.gold, 'gold'); g.add(meshPart(pole, [0, 0, 0], 'pole'));
  const flag = piv('flag', g, 0, 9, 0); const fv = new Vox(); fv.box(1, -4, 0, 4, 0, 0, color, 'cloth'); fv.box(1, -5, 0, 1, -5, 0, color, 'cloth'); fv.box(3, -5, 0, 4, -5, 0, color, 'cloth'); fv.box(2, -2, 0, 3, -2, 0, mark, 'gold'); fv.box(2, -3, 0, 2, -3, 0, mark, 'gold'); flag.add(meshPart(fv, [0, 0, 0], 'flagCloth'));
  return prop('banner', g, 11, ['idle']);
}

/* ---------- plants, rocks, stones, hedges ---------- */
export function buildTree(kind: 'round' | 'pink' | 'pine' = 'round', seed = 1): Rig {
  const v = new Vox(), r = rng(seed);
  if (kind === 'pine') { v.box(0, 0, 0, 0, 2, 0, C.woodDark, 'wood'); for (let i = 0; i < 4; i++) v.cone(0, 0, 4 - i * 0.6, 2 + i * 2, 3, i % 2 ? C.greenDark : C.green, 'leaf'); }
  else { v.box(0, 0, 0, 0, 3, 0, C.wood, 'wood'); v.box(-1, 0, 0, 1, 0, 0, C.wood, 'wood'); const c = kind === 'pink' ? C.pink : C.green, c2 = kind === 'pink' ? C.pinkDark : C.greenDark, c3 = kind === 'pink' ? C.white : C.leafLight; v.ellipsoid(0, 6, 0, 3.6, 3.2, 3.6, c, 'leaf'); v.ellipsoid(-2, 5, 1, 2, 2, 2, c2, 'leaf'); v.ellipsoid(2, 7, -1, 2.2, 2, 2.2, c2, 'leaf'); for (let i = 0; i < 8; i++) v.paint(Math.round(Math.sin(i * 2.4) * 3), 6 + Math.round(Math.cos(i * 1.7) * 2), Math.round(Math.cos(i * 2.4) * 3), i % 2 ? c3 : (kind === 'pink' ? C.gold : C.crimson)); }
  v.jitter(seed, 0.05, ['leaf']); void r;
  return prop(`tree:${kind}`, v, 10);
}
export function buildShrub(seed = 2): Rig { const v = new Vox(); v.ellipsoid(0, 1.5, 0, 2.6, 1.8, 2.4, C.green, 'leaf'); v.ellipsoid(1.5, 2, 0.5, 1.5, 1.2, 1.5, C.greenDark, 'leaf'); v.paint(0, 3, 1, C.pink); v.paint(-2, 2, 0, C.gold); v.jitter(seed, 0.05); return prop('shrub', v, 4); }
export function buildRock(seed = 3): Rig { const v = new Vox(), r = rng(seed); v.ellipsoid(0, 1.5, 0, 3, 2, 2.6, C.stone, 'stone'); v.ellipsoid(1.5, 2, -0.5, 1.6, 1.6, 1.4, C.stoneLight, 'stone'); for (let i = 0; i < 4; i++) v.paint(Math.round(r() * 4 - 2), 3, Math.round(r() * 2 - 1), C.moss, 'moss'); v.jitter(seed, 0.06); return prop('rock', v, 4); }
export function buildSteppingStone(): Rig { const v = new Vox(); v.ellipsoid(0, 0, 0, 2.2, 0.6, 2, C.stone, 'stone'); v.paint(0, 0, 0, C.stoneLight); return prop('steppingStone', v, 1); }
export function buildHedge(len = 6): Rig { const v = new Vox(); v.box(0, 0, -1, len - 1, 3, 1, C.greenDark, 'leaf'); for (let x = 0; x < len; x++) for (let z = -1; z <= 1; z++) if ((x + z) % 3 === 0) v.paint(x, 3, z, C.green); v.jitter(len, 0.05); return prop('hedge', v, 4); }

/* ---------- terrain tiles (12 x 12, top at y = 0) ---------- */
export function buildTile(kind: 'grass' | 'sand' | 'water' | 'path' | 'flowers', seed = 4): Rig {
  const v = new Vox(), r = rng(seed), half = TILE / 2;
  for (let x = -half; x < half; x++) for (let z = -half; z < half; z++) {
    v.set(x, -3, z, C.dirt, 'dirt'); v.set(x, -2, z, C.dirt, 'dirt');
    if (kind === 'water') { v.set(x, -1, z, r() < 0.12 ? C.waterDeep : C.water, 'water'); }
    else if (kind === 'sand') v.set(x, -1, z, r() < 0.1 ? shade(C.sand, 0.93) : C.sand, 'sand');
    else if (kind === 'path') v.set(x, -1, z, (x + z) % 2 ? C.stoneLight : C.stone, 'stone');
    else { v.set(x, -1, z, r() < 0.15 ? C.grassDark : C.grass, 'grass'); if (kind === 'flowers' && r() < 0.07) v.set(x, 0, z, [C.pink, C.gold, C.white][Math.floor(r() * 3)], 'cloth'); }
  }
  return prop(`tile:${kind}`, v, 0);
}
