/**
 * Pixel toolkit shared by every character (decided Nov 13 2026: a true Minecraft pixel style). Everything is a box on a
 * 1/16 m grid and builders write sizes and positions in texels ("px"). Every face shows one texel of a 16×16
 * nearest-filtered pattern per px, so pixels are the same size on every part. Faces are flat pixel decals, cones are stepped.
 */
import {BoxGeometry, BufferGeometry, DataTexture, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, Object3D, RepeatWrapping, type Material, type Texture} from 'three';
import {rng} from '../rng';

/** One texel: 6.25 cm, Minecraft's density (16 px to the metre). */
export const PX = 1 / 16;
export type MatKind = 'skin' | 'gloss' | 'eye' | 'flat' | 'cloth' | 'quilt' | 'leather' | 'metal' | 'gold' | 'wood' | 'blush' | 'stone' | 'rock' | 'slime' | 'scale' | 'glow' | 'grass' | 'leaf' | 'sand' | 'water' | 'glass';
export const EYE_INK = 0x1b1518, INK = 0x3a2630, MOUTH_IN = 0xd9475a, BLUSH = 0xf3a7a1;

type Paint = (x: number, y: number, r: () => number) => number;
const pick = (r: () => number, ...levels: number[]): number => levels[Math.floor(r() * levels.length)];
/** Brightness (1 = the material colour) of each texel of a kind's 16×16 pattern: planks, bricks, scales, weave, speckle. */
const PAINT: Partial<Record<MatKind, Paint>> = {
  skin: (_x, _y, r) => (r() < 0.14 ? 0.94 : 1),
  cloth: (_x, y, r) => pick(r, 1, 1, 0.95, 0.9) * (y % 4 === 3 ? 0.95 : 1),
  quilt: (x, y, r) => ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0 ? 0.8 : pick(r, 1, 0.96)),
  leather: (_x, _y, r) => pick(r, 1, 0.94, 0.94, 0.86),
  metal: (x, y, r) => ((x + y) % 16 < 2 ? 1 : (x + y) % 16 === 9 ? 0.82 : y % 8 === 7 ? 0.8 : pick(r, 0.93, 0.9)),
  gold: (x, y, r) => ((x + y) % 16 < 2 ? 1 : (x + y) % 16 === 9 ? 0.8 : pick(r, 0.92, 0.88)),
  gloss: (x, y) => ((x + y) % 8 === 1 ? 1 : (x + y) % 8 === 5 ? 0.8 : 0.9),
  wood: (x, y, r) => (y % 4 === 3 || x === ((y >> 2) * 5 + 3) % 16 ? 0.72 : pick(r, 1, 0.95, 0.9)),
  stone: (x, y, r) => (y % 4 === 3 || (x + ((y >> 2) % 2) * 4) % 8 === 7 ? 0.76 : pick(r, 1, 0.96, 0.92)),
  rock: (_x, _y, r) => pick(r, 1, 0.93, 0.93, 0.86, 0.78),
  slime: (_x, _y, r) => (r() < 0.12 ? 1 : 0.92),
  scale: (x, y) => { const lx = (x + ((y >> 2) % 2) * 2) % 4, ly = y % 4; return ly === 3 || (ly === 2 && (lx === 0 || lx === 3)) ? 0.82 : ly === 0 ? 1 : 0.94; },
  grass: (_x, _y, r) => pick(r, 1, 0.93, 0.86, 0.8),
  leaf: (_x, _y, r) => pick(r, 1, 0.9, 0.9, 0.78, 0.66),
  sand: (_x, _y, r) => pick(r, 1, 0.97, 0.94),
  water: (x, y, r) => (y % 5 === 1 && (x + y * 3) % 7 < 3 ? 1 : pick(r, 0.92, 0.89)),
};

const geos = new Map<string, BufferGeometry>(), mats = new Map<string, Material>(), maps = new Map<MatKind, Texture>();
function pattern(kind: MatKind): Texture | null {
  const paint = PAINT[kind]; if (!paint) return null;
  let t = maps.get(kind); if (t) return t;
  const data = new Uint8Array(16 * 16 * 4), r = rng(kind.length * 31 + kind.charCodeAt(0));
  // the map multiplies the colour in linear light, so brightness is stored as p^2.2
  for (let i = 0; i < 256; i++) { const v = Math.round(255 * Math.min(1, paint(i % 16, i >> 4, r)) ** 2.2); data.set([v, v, v, 255], i * 4); }
  t = new DataTexture(data, 16, 16); t.magFilter = t.minFilter = NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = RepeatWrapping; t.needsUpdate = true;
  maps.set(kind, t); return t;
}
export const geo = (key: string, make: () => BufferGeometry): BufferGeometry => { let g = geos.get(key); if (!g) { g = make(); geos.set(key, g); } return g; };
export function softMaterial(kind: MatKind, color: number): Material {
  const key = `${kind}:${color}`; let m = mats.get(key); if (m) return m;
  const map = pattern(kind);
  if (kind === 'flat' || kind === 'glow' || kind === 'eye') m = new MeshBasicMaterial({color});
  else if (kind === 'glass') m = new MeshBasicMaterial({color, transparent: true, opacity: 0.28, depthWrite: false}); // helmets and masks: the face must show through
  else if (kind === 'blush') m = new MeshBasicMaterial({color, transparent: true, opacity: 0.75});
  else if (kind === 'slime') m = new MeshStandardMaterial({color, roughness: 0.9, map, transparent: true, opacity: 0.74});
  else m = new MeshStandardMaterial({color, roughness: kind === 'water' || kind === 'gloss' ? 0.55 : 0.92, map});
  m.userData.soft = {kind, color}; // lets a world (scenes/worlds.ts) recolour a mesh without knowing who built it
  mats.set(key, m); return m;
}
export function disposeSoftResources(): void { for (const g of geos.values()) g.dispose(); geos.clear(); for (const m of mats.values()) m.dispose(); mats.clear(); for (const t of maps.values()) t.dispose(); maps.clear(); }
export const mesh = (g: BufferGeometry, m: Material, shadow = true): Mesh => { const o = new Mesh(g, m); o.castShadow = shadow; o.receiveShadow = shadow; return o; };

/** A w×h×d px box whose UVs give every face one pattern texel per px. `seed` shifts the pattern by whole texels. */
export function pxGeometry(w: number, h: number, d: number, seed = 0): BufferGeometry {
  const g = new BoxGeometry(w * PX, h * PX, d * PX), uv = g.getAttribute('uv'), span = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const k = Math.floor(seed * 13 + f * 5 + w * 3 + h * 7 + d * 11), ox = k % 16, oy = (k * 7) % 16;
    for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, (uv.getX(i) * span[f][0] + ox) / 16, (uv.getY(i) * span[f][1] + oy) / 16);
  }
  return g;
}
/** The same box sized in metres, for scene code that still thinks in metres. */
export const blockGeometry = (w: number, h: number, d: number, seed = 0): BufferGeometry => pxGeometry(w / PX, h / PX, d / PX, seed);
export const cube = (w: number, h: number, d: number): BufferGeometry => geo(`px:${w}:${h}:${d}`, () => pxGeometry(w, h, d));
/** A named pivot at (x, y, z) px. */
export const piv = (name: string, parent: Object3D, x: number, y: number, z: number): Object3D => { const o = new Object3D(); o.name = name; o.position.set(x * PX, y * PX, z * PX); parent.add(o); return o; };
/** The building block of every body: a w×h×d px box centred at (x, y, z) px. */
export const box = (parent: Object3D, m: Material, w: number, h: number, d: number, x: number, y: number, z: number, shadow = true): Mesh => { const o = mesh(cube(w, h, d), m, shadow); o.position.set(x * PX, y * PX, z * PX); parent.add(o); return o; };
const THIN = 0.12;
/** A painted pixel: a w×h px plate lying on a +z face at depth z (px). `lift` stacks one decal on another. */
export const decal = (parent: Object3D, m: Material, w: number, h: number, x: number, y: number, z: number, lift = 0): Mesh => box(parent, m, w, h, THIN, x, y, z + THIN / 2 + lift * 0.08, false);
/** A stepped pyramid (roofs, tents, pines): square layers `tier` px tall from `base` px wide down to `top`, 2 px narrower each step. Returns the top y. */
export function steps(parent: Object3D, m: Material, base: number, tier: number, x: number, y: number, z: number, top = 2): number {
  let at = y; for (let side = base; side >= top; side -= 2) { box(parent, m, side, tier, side, x, at + tier / 2, z); at += tier; }
  return at;
}

export type EyeOpts = {x: number; y: number; z: number; w?: number; h?: number; single?: boolean; white?: boolean};
/** Pixel eyes: a dark w×h block with one white highlight pixel. Pivots are named eyeL/eyeR (or eye) so the animator can blink them. */
export function eyes(parent: Object3D, o: EyeOpts): void {
  const w = o.w ?? 2, h = o.h ?? 3, ink = softMaterial('eye', EYE_INK), white = softMaterial('flat', 0xffffff);
  for (const s of o.single ? [0] : [-1, 1]) {
    const eye = piv(o.single ? 'eye' : s < 0 ? 'eyeL' : 'eyeR', parent, s * o.x, o.y, o.z);
    if (o.white) decal(eye, softMaterial('flat', 0xfffaf4), w + 2, h + 2, 0, 0, 0);
    decal(eye, ink, w, h, 0, 0, 0, o.white ? 1 : 0); decal(eye, white, 1, 1, -(w - 1) / 2, (h - 1) / 2, 0, o.white ? 2 : 1);
  }
}
export function blush(parent: Object3D, x: number, y: number, z: number, w = 2): void { for (const s of [-1, 1]) decal(parent, softMaterial('blush', BLUSH), w, 1, s * x, y, z); }
/** A pixel smile: two corner pixels and a row under them, w px wide, corners at y. */
export function smile(parent: Object3D, y: number, z: number, w = 4, name = 'mouthSmile'): Group {
  const g = new Group(); g.name = name; parent.add(g); const ink = softMaterial('flat', INK);
  for (const s of [-1, 1]) decal(g, ink, 1, 1, s * (w - 1) / 2, y, z);
  decal(g, ink, w - 2, 1, 0, y - 1, z); return g;
}
/** A pixel flower: stem, four petals and a centre, each one s px cube. Slimes and giants wear one. */
export function flower(parent: Object3D, x: number, y: number, z: number, petal: number, centre: number, s = 1): void {
  box(parent, softMaterial('leaf', 0x3e8e52), s, s, s, x, y + s / 2, z);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box(parent, softMaterial('cloth', petal), s, s, s, x + dx * s, y + s * 1.5, z + dz * s);
  box(parent, softMaterial('gold', centre), s, s, s, x, y + s * 1.5, z);
}
