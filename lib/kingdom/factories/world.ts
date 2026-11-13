/**
 * World pieces in the soft-toy style: castles, modular walls, towers, gates, props, plants and terrain tiles.
 * Pivots the animator drives: `lid` (chest), `flag` (banner), `bridge` (drawbridge). Tiles are CELL (0.96 m) square with their top at y = 0.
 */
import {BoxGeometry, type BufferGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, type Material} from 'three';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import {rng} from '../rng';
import type {AnimState, Rig} from '../types';
import {blob, capsule, cylBox, geo, mesh, piv, pyramid, softMaterial} from './soft';

export const TILE = 12, CELL = 0.96;
const prop = (group: Group, height: number, states: AnimState[] = ['idle']): Rig => {
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const rig = makeRig(group, 'prop', pivots, height, states); rig.dispose = () => { group.removeFromParent(); }; return rig;
};
const rbox = (w: number, h: number, d: number, _r: number): BufferGeometry => geo(`rbox:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d));
const box = (parent: Object3D, m: Material, w: number, h: number, d: number, x: number, y: number, z: number, r = Math.min(w, h, d) * 0.3): Mesh => { const o = mesh(rbox(w, h, d, r), m); o.position.set(x, y, z); parent.add(o); return o; };
const cone = (parent: Object3D, m: Material, r: number, h: number, x: number, y: number, z: number): Mesh => { const o = mesh(geo(`cone:${r}:${h}`, () => pyramid(r, h, 24)), m); o.position.set(x, y + h / 2, z); parent.add(o); return o; };
const cyl = (parent: Object3D, m: Material, r: number, h: number, x: number, y: number, z: number): Mesh => { const o = mesh(geo(`cyl:${r}:${h}`, () => cylBox(r, r * 1.04, h, 28)), m); o.position.set(x, y + h / 2, z); parent.add(o); return o; };
const flagOn = (parent: Object3D, x: number, y: number, z: number, color: number, size = 0.18): void => { const pole = mesh(capsule(0.012, size * 1.4), softMaterial('wood', C.woodDark)); pole.position.set(x, y + size * 0.7, z); parent.add(pole); const f = mesh(geo(`flag:${size}`, () => new PlaneGeometry(size, size * 0.7)), new MeshStandardMaterial({color, roughness: 0.9, side: DoubleSide})); f.position.set(x + size / 2, y + size * 1.05, z); parent.add(f); };
/** Little rounded bumps along a top edge: soft crenellations. */
const crenels = (parent: Object3D, m: Material, x0: number, x1: number, y: number, z: number, n: number, s = 0.08): void => { for (let i = 0; i < n; i++) box(parent, m, s, s * 0.9, s, x0 + ((x1 - x0) * i) / (n - 1), y, z, s * 0.3); };
const windowOn = (parent: Object3D, x: number, y: number, z: number, w = 0.08, h = 0.12): void => { const m = mesh(rbox(w, h, 0.03, 0.025), softMaterial('flat', C.blueDark), false); m.position.set(x, y, z); parent.add(m); };
function tower(parent: Object3D, x: number, z: number, h: number, r: number, stone: Material, roof: Material, knob: Material, flag?: number): void {
  cyl(parent, stone, r, h, x, 0, z); blob(parent, stone, r * 1.08, r * 0.35, r * 1.08, x, h, z);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(parent, stone, r * 0.26, r * 0.22, r * 0.26, x + Math.cos(a) * r * 0.95, h + r * 0.4, z + Math.sin(a) * r * 0.95); }
  cone(parent, roof, r * 1.3, h * 0.55, x, h + r * 0.2, z); blob(parent, knob, r * 0.22, r * 0.22, r * 0.22, x, h + r * 0.2 + h * 0.55, z);
  windowOn(parent, x, h * 0.6, z + r); if (flag !== undefined) flagOn(parent, x, h + r * 0.2 + h * 0.55 + 0.05, z, flag, r * 0.6);
}

export function buildCastle(kind: 'starter' | 'royal'): Rig {
  const royal = kind === 'royal', g = new Group(); g.name = `castle:${kind}`;
  const stone = softMaterial('stone', royal ? C.ivory : C.stoneLight), dark = softMaterial('stone', royal ? C.stoneLight : C.stone), roof = softMaterial('cloth', royal ? C.pink : C.blue), knob = softMaterial('gold', royal ? C.gold : C.blueDark);
  const W = royal ? 2.2 : 1.8, H = royal ? 1.5 : 1.2, D = royal ? 1.5 : 1.3, th = royal ? 2.1 : 1.6, tr = royal ? 0.34 : 0.3;
  box(g, stone, W, H, D, 0, H / 2, 0, 0.16);
  crenels(g, dark, -W / 2 + 0.15, W / 2 - 0.15, H + 0.05, D / 2 - 0.08, royal ? 9 : 7, 0.1); crenels(g, dark, -W / 2 + 0.15, W / 2 - 0.15, H + 0.05, -D / 2 + 0.08, royal ? 9 : 7, 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(g, sx * (W / 2 + 0.05), sz * (D / 2 + 0.05), th, tr, stone, roof, knob, sz > 0 ? (royal ? C.pink : C.blue) : undefined);
  // central keep with the tallest roof
  const kw = W * 0.5, kh = H * 0.7; box(g, stone, kw, kh, D * 0.5, 0, H + kh / 2, -D * 0.1, 0.12); cone(g, roof, kw * 0.78, H * 0.75, 0, H + kh, -D * 0.1); blob(g, knob, 0.09, 0.09, 0.09, 0, H + kh + H * 0.75, -D * 0.1); flagOn(g, 0, H + kh + H * 0.75 + 0.08, -D * 0.1, royal ? C.gold : C.crimson, 0.26);
  // gate: dark arch, wooden door, two banners
  const gw = royal ? 0.5 : 0.42, gh = royal ? 0.72 : 0.6; box(g, softMaterial('flat', C.blueDark), gw, gh, 0.1, 0, gh / 2 - 0.02, D / 2, 0.08); box(g, softMaterial('wood', C.wood), gw * 0.8, gh * 0.85, 0.06, 0, gh * 0.42, D / 2 + 0.04, 0.06);
  for (const s of [-1, 1]) { box(g, softMaterial('cloth', royal ? C.gold : C.crimson), 0.12, 0.34, 0.03, s * (gw / 2 + 0.16), gh * 0.75, D / 2 + 0.03, 0.02); blob(g, softMaterial('gold', royal ? C.crimson : C.gold), 0.03, 0.03, 0.02, s * (gw / 2 + 0.16), gh * 0.75, D / 2 + 0.05, false); }
  for (const s of [-1, 1]) windowOn(g, s * W * 0.3, H * 0.62, D / 2 + 0.01); windowOn(g, 0, H + kh * 0.55, -D * 0.1 + D * 0.25 + 0.01);
  if (royal) for (const s of [-1, 1]) box(g, softMaterial('gold', C.gold), 0.06, H, 0.06, s * (W / 2 - 0.03), H / 2, D / 2 + 0.01, 0.02);
  return prop(g, H + kh + H * 0.75 + 0.3);
}
export function buildWall(): Rig { const g = new Group(), m = softMaterial('stone', C.stoneLight); box(g, m, CELL, 0.55, 0.2, 0, 0.275, 0, 0.05); crenels(g, softMaterial('stone', C.stone), -CELL / 2 + 0.12, CELL / 2 - 0.12, 0.6, 0, 4, 0.1); return prop(g, 0.7); }
export function buildTower(): Rig { const g = new Group(); tower(g, 0, 0, 1.4, 0.3, softMaterial('stone', C.stoneLight), softMaterial('cloth', C.blue), softMaterial('gold', C.gold), C.blue); return prop(g, 2.5); }
export function buildGate(): Rig {
  const g = new Group(), m = softMaterial('stone', C.stoneLight); box(g, m, 1.2, 0.95, 0.32, 0, 0.475, 0, 0.08);
  box(g, softMaterial('flat', C.blueDark), 0.5, 0.7, 0.34, 0, 0.33, 0, 0.1); crenels(g, softMaterial('stone', C.stone), -0.5, 0.5, 1.0, 0.1, 5, 0.1);
  for (const s of [-1, 1]) { cyl(g, m, 0.14, 1.05, s * 0.62, 0, 0); blob(g, m, 0.15, 0.07, 0.15, s * 0.62, 1.05, 0); }
  return prop(g, 1.15);
}
export function buildDrawbridge(): Rig {
  const g = new Group(), wood = softMaterial('wood', C.wood); for (const s of [-1, 1]) { cyl(g, softMaterial('stone', C.stoneLight), 0.08, 0.9, s * 0.38, 0, -0.05); blob(g, softMaterial('stone', C.stone), 0.09, 0.05, 0.09, s * 0.38, 0.9, -0.05); }
  const bridge = piv('bridge', g, 0, 0.04, 0); bridge.rotation.x = -1.45; box(bridge, wood, 0.6, 0.06, 0.9, 0, 0, 0.45, 0.02); for (let i = 0; i < 4; i++) box(bridge, softMaterial('wood', C.woodDark), 0.6, 0.02, 0.03, 0, 0.035, 0.12 + i * 0.22, 0.008);
  for (const s of [-1, 1]) { const chain = mesh(capsule(0.012, 0.8), softMaterial('metal', C.ironDark)); chain.position.set(s * 0.27, 0.5, 0.12); chain.rotation.x = 0.35; bridge.add(chain); }
  return prop(g, 1.0, ['idle', 'celebrate']);
}
export function buildFence(): Rig { const g = new Group(), wood = softMaterial('wood', C.wood); for (let i = 0; i < 4; i++) { const p = mesh(capsule(0.03, 0.28), wood); p.position.set(-CELL / 2 + 0.06 + i * ((CELL - 0.12) / 3), 0.17, 0); g.add(p); } box(g, softMaterial('wood', C.woodDark), CELL, 0.035, 0.035, 0, 0.13, 0, 0.012); box(g, softMaterial('wood', C.woodDark), CELL, 0.035, 0.035, 0, 0.26, 0, 0.012); return prop(g, 0.4); }
export function buildTent(color: number = C.crimson): Rig { const g = new Group(); cone(g, softMaterial('cloth', C.ivory), 0.55, 0.7, 0, 0, 0); cone(g, softMaterial('cloth', color), 0.26, 0.34, 0, 0.4, 0); blob(g, softMaterial('gold', C.gold), 0.04, 0.04, 0.04, 0, 0.76, 0); box(g, softMaterial('flat', C.blueDark), 0.18, 0.3, 0.04, 0, 0.14, 0.44, 0.05); flagOn(g, 0, 0.78, 0, color, 0.16); return prop(g, 1.0); }
export function buildChest(): Rig {
  const g = new Group(), wood = softMaterial('wood', C.wood), gold = softMaterial('gold', C.gold); box(g, wood, 0.5, 0.3, 0.34, 0, 0.15, 0, 0.05);
  for (const x of [-0.16, 0.16]) box(g, gold, 0.05, 0.31, 0.35, x, 0.15, 0, 0.012);
  const lid = piv('lid', g, 0, 0.3, -0.17); box(lid, softMaterial('wood', shade(C.wood, 1.1)), 0.5, 0.14, 0.34, 0, 0.07, 0.17, 0.06); for (const x of [-0.16, 0.16]) box(lid, gold, 0.05, 0.15, 0.35, x, 0.07, 0.17, 0.012);
  blob(g, gold, 0.045, 0.05, 0.025, 0, 0.3, 0.17); return prop(g, 0.45, ['idle', 'celebrate']);
}
export function buildBanner(color: number = C.crimson, mark: number = C.gold): Rig {
  const g = new Group(); const pole = mesh(capsule(0.02, 1.16), softMaterial('wood', C.woodDark)); pole.position.y = 0.6; g.add(pole); blob(g, softMaterial('gold', mark), 0.035, 0.035, 0.035, 0, 1.2, 0);
  const flag = piv('flag', g, 0, 1.14, 0); const f = mesh(geo('banner', () => new PlaneGeometry(0.5, 0.62)), new MeshStandardMaterial({color, roughness: 0.9, side: DoubleSide})); f.position.set(0.27, -0.31, 0); flag.add(f); blob(flag, softMaterial('gold', mark), 0.09, 0.09, 0.012, 0.27, -0.31, 0.01, false);
  return prop(g, 1.25);
}
export function buildTree(kind: 'round' | 'pink' | 'pine' = 'round', seed = 1): Rig {
  const g = new Group(), r = rng(seed), trunk = softMaterial('wood', C.woodDark); const t = mesh(capsule(0.07, 0.3), trunk); t.position.y = 0.3; g.add(t);
  if (kind === 'pine') { const m = softMaterial('cloth', C.greenDark); cone(g, m, 0.42, 0.5, 0, 0.35, 0); cone(g, m, 0.33, 0.45, 0, 0.68, 0); cone(g, softMaterial('cloth', C.green), 0.22, 0.4, 0, 0.98, 0); return prop(g, 1.4); }
  const m = softMaterial('cloth', kind === 'pink' ? C.pink : C.green), m2 = softMaterial('cloth', kind === 'pink' ? C.pinkDark : C.greenDark);
  blob(g, m2, 0.42, 0.36, 0.42, 0, 0.72, 0); for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2; blob(g, m, 0.28, 0.25, 0.28, Math.cos(a) * 0.24, 0.72 + r() * 0.2, Math.sin(a) * 0.24); } blob(g, m, 0.26, 0.24, 0.26, 0, 1.0, 0);
  return prop(g, 1.3);
}
export function buildShrub(seed = 2): Rig { const g = new Group(), r = rng(seed), m = softMaterial('cloth', C.green), m2 = softMaterial('cloth', C.greenDark); blob(g, m2, 0.26, 0.2, 0.24, 0, 0.17, 0); for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2; blob(g, m, 0.17, 0.15, 0.17, Math.cos(a) * 0.16, 0.2 + r() * 0.08, Math.sin(a) * 0.14); } return prop(g, 0.4); }
export function buildRock(seed = 3): Rig { const g = new Group(), r = rng(seed), m = softMaterial('stone', C.stone); blob(g, m, 0.32, 0.22, 0.28, 0, 0.18, 0); blob(g, softMaterial('stone', C.stoneDark), 0.2, 0.16, 0.18, 0.2 + r() * 0.05, 0.12, 0.1); blob(g, softMaterial('cloth', C.moss), 0.16, 0.05, 0.14, -0.06, 0.38, 0.02); return prop(g, 0.42); }
export function buildSteppingStone(): Rig { const g = new Group(); blob(g, softMaterial('stone', C.stoneLight), 0.22, 0.05, 0.2, 0, 0.02, 0); return prop(g, 0.07); }
export function buildHedge(): Rig { const g = new Group(), m = softMaterial('cloth', C.greenDark), m2 = softMaterial('cloth', C.green); box(g, m, 0.48, 0.38, 0.3, 0, 0.19, 0, 0.12); for (const x of [-0.14, 0.02, 0.16]) blob(g, m2, 0.11, 0.08, 0.11, x, 0.4, (x * 7) % 0.1); return prop(g, 0.5); }
export function buildTile(kind: 'grass' | 'sand' | 'water' | 'path' | 'flowers', seed = 4): Rig {
  const g = new Group(), r = rng(seed);
  const m = kind === 'water' ? softMaterial('gloss', C.water) : kind === 'sand' ? softMaterial('cloth', C.sand) : kind === 'path' ? softMaterial('stone', C.stoneLight) : softMaterial('cloth', C.grass);
  box(g, m, CELL * 0.985, 0.1, CELL * 0.985, 0, -0.05, 0, 0.035);
  if (kind === 'flowers') for (let i = 0; i < 5; i++) blob(g, softMaterial('cloth', [C.pink, C.white, C.gold][i % 3]), 0.028, 0.02, 0.028, (r() - 0.5) * 0.8, 0.01, (r() - 0.5) * 0.8);
  if (kind === 'water') for (let i = 0; i < 3; i++) blob(g, softMaterial('cloth', C.white), 0.08, 0.008, 0.03, (r() - 0.5) * 0.6, 0.005, (r() - 0.5) * 0.6, false);
  return prop(g, 0.06);
}
