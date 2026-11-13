/**
 * Render looks for any rig. The soft toy is the product avatar; `wire` and `dots` re-present the same meshes for
 * mini-game sequences and Muse moments (the dotted orb language) without touching geometry, pivots or animation.
 * Look children hang under each mesh, so they follow every pose; `applyLook(root, 'soft')` restores the original.
 */
import {BufferGeometry, Color, EdgesGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Object3D, Points, PointsMaterial, Vector3, type Material} from 'three';
import {MeshSurfaceSampler} from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export type Look = 'soft' | 'wire' | 'dots';
export type LookPalette = {wire: number; edge: number; warm: number; ivory: number; cool: number; ink: number};
/** Classic Facebook blue lines; Muse orb dots: warm ember low-left, ivory middle, pale blue top-right. */
export const LOOK_PALETTE: LookPalette = {wire: 0x1877f2, edge: 0x1263cc, warm: 0xf29a5b, ivory: 0xfae8d5, cool: 0x9ec1ff, ink: 0x14233c};

const invisible = new MeshBasicMaterial({visible: false});
let wireMat: MeshBasicMaterial | null = null, edgeMat: LineBasicMaterial | null = null, dotMat: PointsMaterial | null = null;
const mats = (p: LookPalette) => {
  wireMat ??= new MeshBasicMaterial({color: p.wire, wireframe: true, transparent: true, opacity: 0.14, depthWrite: false});
  edgeMat ??= new LineBasicMaterial({color: p.edge, transparent: true, opacity: 0.85});
  dotMat ??= new PointsMaterial({size: 0.026, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false});
  return {wireMat, edgeMat, dotMat};
};
const boxArea = (m: Mesh): number => { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox!, s = new Vector3(); m.getWorldScale(s); const w = (b.max.x - b.min.x) * Math.abs(s.x), h = (b.max.y - b.min.y) * Math.abs(s.y), d = (b.max.z - b.min.z) * Math.abs(s.z); return 2 * (w * h + h * d + w * d); };
const clearLook = (m: Mesh): void => { for (const c of [...m.children]) if (c.userData.look) { m.remove(c); (c as Points).geometry?.dispose(); } };

export function applyLook(root: Object3D, look: Look, opts: {density?: number; palette?: LookPalette} = {}): void {
  const p = opts.palette ?? LOOK_PALETTE, density = opts.density ?? 650, {wireMat, edgeMat, dotMat} = mats(p);
  root.updateMatrixWorld(true);
  const warm = new Color(p.warm), ivory = new Color(p.ivory), cool = new Color(p.cool), ink = new Color(p.ink), c = new Color(), pos = new Vector3(), wpos = new Vector3();
  root.traverse((o) => {
    const m = o as Mesh; if (!m.isMesh) return;
    if (!m.userData.softMaterial) m.userData.softMaterial = m.material;
    clearLook(m);
    if (look === 'soft') { m.material = m.userData.softMaterial as Material; return; }
    if (look === 'wire') { m.material = wireMat; const e = new LineSegments(new EdgesGeometry(m.geometry, 24), edgeMat); e.userData.look = 1; m.add(e); return; }
    m.material = invisible;
    const n = Math.min(6000, Math.max(16, Math.round(boxArea(m) * density)));
    const sampler = new MeshSurfaceSampler(m).build(), P = new Float32Array(n * 3), C = new Float32Array(n * 3);
    const dark = ((m.userData.softMaterial as {color?: Color}).color?.getHSL({h: 0, s: 0, l: 0}).l ?? 1) < 0.25;
    for (let i = 0; i < n; i++) {
      sampler.sample(pos); P[i * 3] = pos.x; P[i * 3 + 1] = pos.y; P[i * 3 + 2] = pos.z;
      wpos.copy(pos); m.localToWorld(wpos);
      if (dark) c.copy(ink); else { const t = Math.min(1, Math.max(0, (wpos.x * 0.3 + wpos.y * 0.45 - 0.15) / 1.5)); if (t < 0.5) c.copy(warm).lerp(ivory, t * 2); else c.copy(ivory).lerp(cool, (t - 0.5) * 2); }
      C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b;
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(P, 3)); g.setAttribute('color', new Float32BufferAttribute(C, 3));
    const pts = new Points(g, dotMat); pts.userData.look = 1; m.add(pts);
  });
}
