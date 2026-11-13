/**
 * Voxel grid, mesher and shared materials.
 *
 * A Vox is a sparse grid of coloured cubes, each tagged with a material kind. `meshPart` turns one grid into a
 * few merged meshes (one per material kind present): only exposed faces are emitted, with per-vertex colour,
 * per-vertex ambient occlusion from the three neighbouring cubes, and 0..1 UVs per face so a 16x16 pixel
 * texture (bevel + pattern, nearest-filtered) tiles once per cube face. That gives the "chunky but soft"
 * toy look without a draw call or a rounded geometry per voxel.
 */
import {BufferAttribute, BufferGeometry, CanvasTexture, Color, Group, Mesh, MeshStandardMaterial, type MeshStandardMaterialParameters, NearestFilter, RepeatWrapping, SRGBColorSpace, type Texture} from 'three';
import {C, jitter} from './palette';
import {rng} from './rng';
import type {MaterialKind} from './types';

/** Metres per voxel. A hero is about 27 voxels (2.2 m) tall. */
export const VOXEL = 0.08;

type Cell = {x: number; y: number; z: number; c: number; k: MaterialKind};

export class Vox {
  cells = new Map<number, Cell>();
  static key(x: number, y: number, z: number): number { return (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512); }
  set(x: number, y: number, z: number, c: number, k: MaterialKind = 'cloth'): this { this.cells.set(Vox.key(x, y, z), {x, y, z, c, k}); return this; }
  del(x: number, y: number, z: number): this { this.cells.delete(Vox.key(x, y, z)); return this; }
  has(x: number, y: number, z: number): boolean { return this.cells.has(Vox.key(x, y, z)); }
  get(x: number, y: number, z: number): Cell | undefined { return this.cells.get(Vox.key(x, y, z)); }
  /** Recolour an existing cube (a decal on a surface). */
  paint(x: number, y: number, z: number, c: number, k?: MaterialKind): this { const v = this.get(x, y, z); if (v) { v.c = c; if (k) v.k = k; } return this; }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, k: MaterialKind = 'cloth'): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.set(x, y, z, c, k);
    return this;
  }
  ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: number, k: MaterialKind = 'cloth', test?: (x: number, y: number, z: number) => boolean): this {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
      if (dx * dx + dy * dy + dz * dz <= 1 && (!test || test(x, y, z))) this.set(x, y, z, c, k);
    }
    return this;
  }
  /** Hollow ellipsoid of thickness t, used for hair caps, helmets and shells. */
  shell(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, t: number, c: number, k: MaterialKind = 'cloth', test?: (x: number, y: number, z: number) => boolean): this {
    return this.ellipsoid(cx, cy, cz, rx, ry, rz, c, k, (x, y, z) => { const dx = (x - cx) / (rx - t), dy = (y - cy) / (ry - t), dz = (z - cz) / (rz - t); return dx * dx + dy * dy + dz * dz > 1 && (!test || test(x, y, z)); });
  }
  cylY(cx: number, cz: number, r: number, y0: number, y1: number, c: number, k: MaterialKind = 'cloth'): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) if ((x - cx) ** 2 + (z - cz) ** 2 <= r * r + 0.3) this.set(x, y, z, c, k);
    return this;
  }
  cone(cx: number, cz: number, r: number, y0: number, h: number, c: number, k: MaterialKind = 'cloth', c2?: number): this {
    for (let i = 0; i < h; i++) this.cylY(cx, cz, Math.max(r * (1 - i / h), 0.4), y0 + i, y0 + i, c2 !== undefined && i % 2 ? c2 : c, k);
    return this;
  }
  /** z of the frontmost cube in column (x, y), or null. Used to paint faces. */
  front(x: number, y: number): number | null { let best: number | null = null; for (const v of this.cells.values()) if (v.x === x && v.y === y && (best === null || v.z > best)) best = v.z; return best; }
  decal(x: number, y: number, c: number, k: MaterialKind = 'ink'): this { const z = this.front(x, y); if (z !== null) this.paint(x, y, z, c, k); return this; }
  merge(o: Vox, dx = 0, dy = 0, dz = 0): this { for (const v of o.cells.values()) this.set(v.x + dx, v.y + dy, v.z + dz, v.c, v.k); return this; }
  mirrorX(): this { for (const v of [...this.cells.values()]) if (v.x !== 0) this.set(-v.x, v.y, v.z, v.c, v.k); return this; }
  /** Deterministic brightness jitter on every cube of a kind, to suggest texture. */
  jitter(seed: number, amount = 0.045, kinds?: MaterialKind[]): this { const r = rng(seed); for (const v of this.cells.values()) if (!kinds || kinds.includes(v.k)) v.c = jitter(v.c, r, amount); return this; }
  bounds(): {min: [number, number, number]; max: [number, number, number]} {
    const min: [number, number, number] = [1e9, 1e9, 1e9], max: [number, number, number] = [-1e9, -1e9, -1e9];
    for (const v of this.cells.values()) { min[0] = Math.min(min[0], v.x); min[1] = Math.min(min[1], v.y); min[2] = Math.min(min[2], v.z); max[0] = Math.max(max[0], v.x); max[1] = Math.max(max[1], v.y); max[2] = Math.max(max[2], v.z); }
    return {min, max};
  }
}

/* ---------- pixel textures (16x16, nearest, sRGB). White with marks so vertex colour tints them. ---------- */
const textures = new Map<string, Texture>();
function pixelTex(name: string, paint: (x: CanvasRenderingContext2D, w: number, h: number) => void, bevel = true): Texture {
  const cached = textures.get(name);
  if (cached) return cached;
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 16, 16); paint(x, 16, 16);
  if (bevel) { x.fillStyle = 'rgba(0,0,0,0.14)'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16); x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14); }
  const t = new CanvasTexture(c); t.magFilter = t.minFilter = NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace;
  textures.set(name, t); return t;
}
const TEX: Record<string, () => Texture> = {
  plain: () => pixelTex('plain', () => {}),
  cloth: () => pixelTex('cloth', (x) => { x.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if ((i + j) % 2 === 0) x.fillRect(i, j, 1, 1); }),
  quilt: () => pixelTex('quilt', (x) => { x.strokeStyle = 'rgba(0,0,0,0.16)'; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.moveTo(8, 16); x.lineTo(16, 8); x.moveTo(0, 8); x.lineTo(8, 16); x.moveTo(8, 0); x.lineTo(16, 8); x.stroke(); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(7, 7, 2, 2); }),
  metal: () => pixelTex('metal', (x) => { x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(2, 2, 6, 1); x.fillRect(2, 3, 2, 1); x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(4, 12, 9, 1); x.fillRect(12, 6, 1, 7); }),
  wood: () => pixelTex('wood', (x) => { x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(5, 0, 1, 16); x.fillRect(11, 0, 1, 16); x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(2, 3, 1, 4); x.fillRect(8, 9, 1, 3); x.fillRect(13, 1, 1, 5); }),
  stone: () => pixelTex('stone', (x) => { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7); x.fillStyle = 'rgba(255,255,255,0.2)'; x.fillRect(2, 2, 3, 1); x.fillRect(9, 10, 1, 1); }),
  moss: () => pixelTex('moss', (x) => { x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 9; i++) x.fillRect((i * 7) % 16, (i * 5) % 16, 2, 1); x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 5; i++) x.fillRect((i * 11 + 3) % 16, (i * 7 + 2) % 16, 1, 1); }),
  scale: () => pixelTex('scale', (x) => { x.strokeStyle = 'rgba(0,0,0,0.18)'; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { x.beginPath(); x.arc(c * 4 + (r % 2) * 2, r * 4 + 2, 2.4, Math.PI, 0); x.stroke(); } }),
  grass: () => pixelTex('grass', (x) => { x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 10; i++) x.fillRect((i * 13) % 16, (i * 7) % 16, 1, 2); x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 4; i++) x.fillRect((i * 9 + 4) % 16, (i * 11 + 1) % 16, 1, 1); }),
  leaf: () => pixelTex('leaf', (x) => { x.fillStyle = 'rgba(0,0,0,0.14)'; for (let i = 0; i < 7; i++) x.fillRect((i * 5) % 16, (i * 9) % 16, 2, 1); x.fillStyle = 'rgba(255,255,255,0.3)'; for (let i = 0; i < 3; i++) x.fillRect((i * 7 + 3) % 16, (i * 11 + 5) % 16, 1, 1); }),
  slime: () => pixelTex('slime', (x) => { x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(3, 3, 3, 2); x.fillRect(4, 2, 1, 1); x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(10, 10, 2, 2); }, false),
  water: () => pixelTex('water', (x) => { x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(2, 4, 5, 1); x.fillRect(9, 11, 4, 1); }, false),
};

/* ---------- shared materials, one per kind ---------- */
const materials = new Map<MaterialKind, MeshStandardMaterial>();
const SPEC: Record<MaterialKind, {tex: string; roughness: number; metalness: number; extra?: MeshStandardMaterialParameters}> = {
  skin: {tex: 'plain', roughness: 0.75, metalness: 0},
  cloth: {tex: 'cloth', roughness: 0.95, metalness: 0},
  quilt: {tex: 'quilt', roughness: 0.95, metalness: 0},
  leather: {tex: 'cloth', roughness: 0.8, metalness: 0},
  metal: {tex: 'metal', roughness: 0.42, metalness: 0.4},
  gold: {tex: 'metal', roughness: 0.35, metalness: 0.5},
  wood: {tex: 'wood', roughness: 0.85, metalness: 0},
  stone: {tex: 'stone', roughness: 0.95, metalness: 0},
  moss: {tex: 'moss', roughness: 0.95, metalness: 0},
  leaf: {tex: 'leaf', roughness: 0.9, metalness: 0},
  scale: {tex: 'scale', roughness: 0.55, metalness: 0.05},
  slime: {tex: 'slime', roughness: 0.25, metalness: 0, extra: {transparent: true, opacity: 0.88}},
  glow: {tex: 'plain', roughness: 0.5, metalness: 0, extra: {emissive: new Color(0xffffff), emissiveIntensity: 0.6}},
  ink: {tex: 'plain', roughness: 0.35, metalness: 0},
  water: {tex: 'water', roughness: 0.2, metalness: 0, extra: {transparent: true, opacity: 0.9}},
  sand: {tex: 'grass', roughness: 0.95, metalness: 0},
  grass: {tex: 'grass', roughness: 0.95, metalness: 0},
  dirt: {tex: 'stone', roughness: 1, metalness: 0},
};
export function material(kind: MaterialKind): MeshStandardMaterial {
  const cached = materials.get(kind);
  if (cached) return cached;
  const s = SPEC[kind];
  const m = new MeshStandardMaterial({color: 0xffffff, vertexColors: true, map: TEX[s.tex](), roughness: s.roughness, metalness: s.metalness, ...(s.extra ?? {})});
  if (kind === 'glow') m.emissive = new Color(0xffffff);
  materials.set(kind, m);
  return m;
}
/** Drop every cached material and texture (call when tearing the whole app down). */
export function disposeSharedResources(): void { for (const m of materials.values()) m.dispose(); materials.clear(); for (const t of textures.values()) t.dispose(); textures.clear(); }

/* ---------- mesher ---------- */
const DIRS: {n: [number, number, number]; corners: [number, number, number][]; }[] = [
  {n: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]},
  {n: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]},
  {n: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]},
  {n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]},
  {n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]},
  {n: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]},
];
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
function ao(vox: Vox, x: number, y: number, z: number, n: [number, number, number], corner: [number, number, number]): number {
  // the three cubes that touch this vertex on the face's plane
  const sx = corner[0] ? 1 : -1, sy = corner[1] ? 1 : -1, sz = corner[2] ? 1 : -1;
  const a = n[0] ? [0, sy, 0] : [sx, 0, 0], b = n[0] || n[1] ? [0, 0, sz] : [0, sy, 0];
  const p = [x + n[0], y + n[1], z + n[2]];
  const s1 = vox.has(p[0] + a[0], p[1] + a[1], p[2] + a[2]) ? 1 : 0, s2 = vox.has(p[0] + b[0], p[1] + b[1], p[2] + b[2]) ? 1 : 0;
  const cc = vox.has(p[0] + a[0] + b[0], p[1] + a[1] + b[1], p[2] + a[2] + b[2]) ? 1 : 0;
  return s1 && s2 ? 3 : s1 + s2 + cc;
}
const SUN: Record<string, number> = {'0,1,0': 1.0, '0,0,1': 0.93, '1,0,0': 0.86, '-1,0,0': 0.86, '0,0,-1': 0.8, '0,-1,0': 0.62};

/** Mesh one grid into a Group of merged meshes (one per material kind). pivot = which voxel coordinate sits at the group origin. */
export function meshPart(vox: Vox, pivot: [number, number, number] = [0, 0, 0], name = 'part'): Group {
  const byKind = new Map<MaterialKind, {pos: number[]; nor: number[]; col: number[]; uv: number[]; idx: number[]}>();
  const tmp = new Color();
  for (const v of vox.cells.values()) {
    for (const d of DIRS) {
      if (vox.has(v.x + d.n[0], v.y + d.n[1], v.z + d.n[2])) continue;
      let b = byKind.get(v.k);
      if (!b) { b = {pos: [], nor: [], col: [], uv: [], idx: []}; byKind.set(v.k, b); }
      const base = b.pos.length / 3;
      tmp.setHex(v.c);
      const sun = SUN[d.n.join(',')] ?? 0.9;
      for (let i = 0; i < 4; i++) {
        const c = d.corners[i];
        b.pos.push((v.x - pivot[0] + c[0] - 0.5) * VOXEL, (v.y - pivot[1] + c[1] - 0.5) * VOXEL, (v.z - pivot[2] + c[2] - 0.5) * VOXEL);
        b.nor.push(d.n[0], d.n[1], d.n[2]);
        const occ = ao(vox, v.x, v.y, v.z, d.n, c);
        const k = (1 - occ * 0.16) * sun;
        b.col.push(tmp.r * k, tmp.g * k, tmp.b * k);
        b.uv.push(UV[i][0], UV[i][1]);
      }
      b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new Group(); g.name = name;
  for (const [kind, b] of byKind) {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3));
    geo.setAttribute('normal', new BufferAttribute(new Float32Array(b.nor), 3));
    geo.setAttribute('color', new BufferAttribute(new Float32Array(b.col), 3));
    geo.setAttribute('uv', new BufferAttribute(new Float32Array(b.uv), 2));
    geo.setIndex(b.idx);
    const m = new Mesh(geo, material(kind)); m.castShadow = true; m.receiveShadow = true; m.name = `${name}:${kind}`;
    g.add(m);
  }
  return g;
}
export function disposeGroup(root: Group): void { root.traverse((o) => { const m = o as Mesh; if (m.isMesh) m.geometry.dispose(); }); }
