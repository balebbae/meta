/**
 * Block toolkit shared by every character (decided Nov 13 2026: a Minecraft-like block style). Every primitive here is a box
 * or a four-sided pyramid; `blob` and `capsule` keep their old names so the builders read the same. Materials are flat-shaded
 * with a 16×16 nearest-filtered noise map for the per-pixel texture feel.
 */
import {BoxGeometry, BufferGeometry, CanvasTexture, ConeGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NearestFilter, Object3D, PlaneGeometry, QuadraticBezierCurve3, RepeatWrapping, Shape, ShapeGeometry, Vector3, type Material, type Texture} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {rng} from '../rng';

export type MatKind = 'skin' | 'gloss' | 'eye' | 'flat' | 'cloth' | 'quilt' | 'leather' | 'metal' | 'gold' | 'wood' | 'blush' | 'stone' | 'slime' | 'scale' | 'glow';
export const EYE_INK = 0x1b1518, INK = 0x3a2630, MOUTH_IN = 0xd9475a, BLUSH = 0xf3a7a1;

const geos = new Map<string, BufferGeometry>(), mats = new Map<string, Material>();
let noise: Texture | null = null;
/** 16×16 grey noise, nearest-filtered: multiplies each material's colour per texel. */
function pixelNoise(): Texture | null {
  if (noise || typeof document === 'undefined') return noise;
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d')!, r = rng(7);
  for (let i = 0; i < 256; i++) { const v = Math.round(255 * (0.88 + 0.12 * r())); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i % 16, Math.floor(i / 16), 1, 1); }
  noise = new CanvasTexture(c); noise.magFilter = noise.minFilter = NearestFilter; noise.generateMipmaps = false; noise.wrapS = noise.wrapT = RepeatWrapping; return noise;
}
export const geo = (key: string, make: () => BufferGeometry): BufferGeometry => { let g = geos.get(key); if (!g) { g = make(); geos.set(key, g); } return g; };
export function softMaterial(kind: MatKind, color: number): Material {
  const key = `${kind}:${color}`; let m = mats.get(key); if (m) return m;
  switch (kind) {
    case 'skin': m = new MeshStandardMaterial({color, roughness: 0.85, flatShading: true, map: pixelNoise()}); break;
    case 'slime': m = new MeshPhysicalMaterial({color, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3, flatShading: true, map: pixelNoise()}); break;
    case 'scale': m = new MeshStandardMaterial({color, roughness: 0.7, flatShading: true, map: pixelNoise()}); break;
    case 'gloss': m = new MeshPhysicalMaterial({color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1}); break;
    case 'eye': m = new MeshStandardMaterial({color, roughness: 0.32, metalness: 0}); break;
    case 'flat': m = new MeshBasicMaterial({color}); break;
    case 'glow': m = new MeshBasicMaterial({color}); break;
    case 'blush': m = new MeshStandardMaterial({color, roughness: 1, transparent: true, opacity: 0.85}); break;
    case 'metal': m = new MeshStandardMaterial({color, roughness: 0.45, metalness: 0.55, flatShading: true, map: pixelNoise()}); break;
    case 'gold': m = new MeshStandardMaterial({color, roughness: 0.35, metalness: 0.7, flatShading: true, map: pixelNoise()}); break;
    case 'stone': m = new MeshStandardMaterial({color, roughness: 0.95, flatShading: true, map: pixelNoise()}); break;
    case 'quilt': m = new MeshStandardMaterial({color, roughness: 0.95, flatShading: true, map: pixelNoise()}); break;
    case 'leather': m = new MeshStandardMaterial({color, roughness: 0.8, flatShading: true, map: pixelNoise()}); break;
    case 'wood': m = new MeshStandardMaterial({color, roughness: 0.85, flatShading: true, map: pixelNoise()}); break;
    default: m = new MeshStandardMaterial({color, roughness: 0.9, flatShading: true, map: pixelNoise()});
  }
  mats.set(key, m); return m;
}
export function disposeSoftResources(): void { for (const g of geos.values()) g.dispose(); geos.clear(); for (const m of mats.values()) m.dispose(); mats.clear(); }
export const mesh = (g: BufferGeometry, m: Material, shadow = true): Mesh => { const o = new Mesh(g, m); o.castShadow = shadow; o.receiveShadow = shadow; return o; };
export const piv = (name: string, parent: Object3D, x: number, y: number, z: number): Object3D => { const o = new Object3D(); o.name = name; o.position.set(x, y, z); parent.add(o); return o; };
/** A 2×2×2 box (so `blob` radii keep meaning): the unit block. Segmented so cut-aways can slice it. */
export const sphere = (): BufferGeometry => geo('block', () => new BoxGeometry(2, 2, 2, 2, 4, 2));
export const capsule = (r: number, len: number): BufferGeometry => geo(`capsule:${r}:${len}`, () => new BoxGeometry(r * 2, len + r * 2, r * 2));
export const rbox = (w: number, h: number, d: number, _segments = 1, _radius = 0): BufferGeometry => new BoxGeometry(w, h, d);
export const capsuleBox = (r: number, len: number, _a?: number, _b?: number): BufferGeometry => new BoxGeometry(r * 2, len + r * 2, r * 2);
export const cylBox = (rTop: number, rBottom: number, h: number, _s?: number): BufferGeometry => new BoxGeometry(Math.max(rTop, rBottom) * 2, h, Math.max(rTop, rBottom) * 2);
/** Four-sided pyramid aligned with the block axes. */
export const pyramid = (r: number, h: number, _s?: number): BufferGeometry => new ConeGeometry(r * 1.2, h, 4).rotateY(Math.PI / 4);
/** A flat square slab standing in for a torus ring (callers rotate it flat). */
export const ringBox = (R: number, r: number, _a?: number, _b?: number): BufferGeometry => new BoxGeometry(R * 2 + r * 2, R * 2 + r * 2, r * 2);
export const boxSphere = (_r: number, _ws?: number, _hs?: number): BufferGeometry => new BoxGeometry(2, 2, 2, 2, 4, 2);
/** A square (or, with a theta length, the lower half of one) standing in for a disc. */
export const disc = (r: number, _s?: number, _thetaStart?: number, thetaLength?: number): BufferGeometry => (thetaLength ? new PlaneGeometry(r * 2, r).translate(0, -r / 2, 0) : new PlaneGeometry(r * 2, r * 2));
/** A unit block scaled to (sx, sy, sz) at (x, y, z): the building block of every body. */
export const blob = (parent: Object3D, m: Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, shadow = true): Mesh => { const o = mesh(sphere(), m, shadow); o.scale.set(sx, sy, sz); o.position.set(x, y, z); parent.add(o); return o; };

/** Keep only the triangles whose centroid passes `keep`: shells (helmets, vests, saddles) are cut from closed solids. */
export function cutaway(g: BufferGeometry, keep: (x: number, y: number, z: number) => boolean): BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g, pos = src.getAttribute('position'), nor = src.getAttribute('normal'), P: number[] = [], N: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    if (!keep(cx, cy, cz)) continue;
    for (let j = 0; j < 3; j++) { P.push(pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j)); N.push(nor.getX(i + j), nor.getY(i + j), nor.getZ(i + j)); }
  }
  const out = new BufferGeometry(); out.setAttribute('position', new Float32BufferAttribute(P, 3)); out.setAttribute('normal', new Float32BufferAttribute(N, 3)); return out;
}
export const star = (R: number, r: number): BufferGeometry => { const sh = new Shape(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? r : R; if (i === 0) sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); else sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } sh.closePath(); return new ShapeGeometry(sh); };
/** A smile as five little cubes along the curve. */
export const smileTube = (x0: number, x1: number, y: number, dip: number, z: number, r = 0.013): BufferGeometry => {
  const curve = new QuadraticBezierCurve3(new Vector3(x0, y, z), new Vector3((x0 + x1) / 2, y + dip, z), new Vector3(x1, y, z)), parts: BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) { const p = curve.getPoint((i + 0.5) / 5); parts.push(new BoxGeometry(r * 2.4, r * 2.4, r * 2.4).translate(p.x, p.y, p.z)); }
  const g = mergeGeometries(parts)!; for (const p of parts) p.dispose(); return g;
};

export type EyeOpts = {x: number; y: number; z: number; w: number; h: number; depth?: number; yaw?: number; single?: boolean; white?: boolean};
/** Black dome eyes with two highlights. Pivots are named eyeL/eyeR (or eye) so the animator can blink them. */
export function softEyes(parent: Object3D, o: EyeOpts): Object3D[] {
  const eyeMat = softMaterial('eye', EYE_INK), white = softMaterial('flat', 0xffffff), out: Object3D[] = [];
  for (const s of o.single ? [0] : [-1, 1]) {
    const eye = piv(o.single ? 'eye' : s < 0 ? 'eyeL' : 'eyeR', parent, s * o.x, o.y, o.z); eye.rotation.y = s * (o.yaw ?? 0); out.push(eye);
    const depth = o.depth ?? 0.05;
    if (o.white) { blob(eye, softMaterial('flat', 0xfffaf4), o.w * 1.45, o.h * 1.25, depth * 0.8, 0, 0, 0, false); }
    const e = blob(eye, eyeMat, o.w, o.h, depth, 0, 0, o.white ? depth * 0.5 : 0, false);
    const hl = blob(eye, white, o.w * 0.33, o.h * 0.3, 0.012, -o.w * 0.34, o.h * 0.38, (o.white ? depth * 0.5 : 0) + depth * 0.94, false);
    const hl2 = blob(eye, white, o.w * 0.15, o.h * 0.13, 0.01, o.w * 0.32, -o.h * 0.42, (o.white ? depth * 0.5 : 0) + depth * 0.94, false);
    void e; void hl; void hl2;
  }
  return out;
}
export function softBlush(parent: Object3D, x: number, y: number, z: number, w = 0.1, h = 0.052, yaw = 0): void {
  for (const s of [-1, 1]) { const b = blob(parent, softMaterial('blush', BLUSH), w, h, 0.025, s * x, y, z, false); b.rotation.y = s * yaw; }
}
export function softSmile(parent: Object3D, y: number, z: number, w = 0.065, dip = -0.075, r = 0.014, name = 'mouthSmile'): Group {
  const g = new Group(); g.name = name; parent.add(g); const ink = softMaterial('flat', INK);
  g.add(mesh(geo(`smile:${w}:${dip}:${r}`, () => smileTube(-w, w, 0, dip, 0, r)), ink, false));
  for (const s of [-1, 1]) blob(g, ink, r, r, r, s * w, 0, 0, false);
  g.position.set(0, y, z); return g;
}
/** A small flower: stem knob, five petals and a centre. Slimes and giants wear one. */
export function flower(parent: Object3D, x: number, y: number, z: number, petal: number, centre: number, size = 1): Group {
  const g = new Group(); g.position.set(x, y, z); parent.add(g);
  blob(g, softMaterial('cloth', 0x3e8e52), 0.028 * size, 0.035 * size, 0.028 * size, 0, 0, 0);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; blob(g, softMaterial('cloth', petal), 0.032 * size, 0.016 * size, 0.032 * size, Math.cos(a) * 0.045 * size, 0.05 * size, Math.sin(a) * 0.045 * size); }
  blob(g, softMaterial('gold', centre), 0.02 * size, 0.018 * size, 0.02 * size, 0, 0.055 * size, 0);
  return g;
}
