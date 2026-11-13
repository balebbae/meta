/**
 * The stage every mini game stands on: plain three, no React, so the app (an R3F wrapper) and the character sheet run the
 * same scenes. A Stage owns the group, the lights, sky dressing, the rigs it animates, pixel-cube particles, scale pulses,
 * death pops and a camera with shake. Scenes set `eye` and `look`; `update(dt)` does the rest.
 */
import {DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, Object3D, type PerspectiveCamera, Vector3} from 'three';
import {assetById} from '../catalog';
import {C} from '../palette';
import {animate, cloneRig, setState} from '../rig';
import {blockGeometry, box, cube, mesh, softMaterial, type MatKind} from '../factories/soft';
import type {BuildOptions, HeroPreset, Rig} from '../types';
import type {Input, Phase} from '../games/common';

export type Hud = {phase: Phase; score: number; message: string; left: string; right: string};
export type Host = {camera: PerspectiveCamera; hero?: Partial<HeroPreset>};
export type GameScene = {
  group: Group; background: number;
  /** Start (or restart) a run. */
  start: (seed?: number) => void;
  /** Advance the game, the animations and the camera. */
  step: (dt: number, input: Input) => void;
  /** The input a competent player would give right now: drives the attract-mode demo. */
  auto: () => Input;
  hud: () => Hud; dispose: () => void;
};
export const SKY = 0xbfe3ff;
type StageOpts = {fov: number; sun: [number, number, number]; radius: number; /** z of the far backdrop (clouds, hills); omit for top-down scenes. */ far?: number};
type Particle = {mesh: Mesh; vel: Vector3; life: number; max: number; size: number};

export class Stage {
  readonly group = new Group();
  readonly rigs: Rig[] = [];
  /** Where the scene wants the camera this frame; shake is added on top. */
  readonly eye = new Vector3(0, 5, 10);
  readonly look = new Vector3();
  private readonly parts: Particle[] = [];
  private readonly mats = new Map<number, MeshBasicMaterial>();
  private readonly pulses = new Map<Object3D, {base: number; extra: number}>();
  private readonly dying: {rig: Rig; t: number; base: number}[] = [];
  private readonly clouds: Object3D[] = [];
  private readonly made: {dispose: () => void}[] = [];
  private trauma = 0;
  private clock = 0;

  constructor(readonly host: Host, o: StageOpts) {
    host.camera.fov = o.fov; host.camera.updateProjectionMatrix();
    this.group.add(new HemisphereLight(0xe8f4ff, 0xa7b59c, 0.95)); // a pale bounce: a saturated green one tints every stone underside
    const sun = new DirectionalLight(0xfff6e2, 2.5); sun.position.set(...o.sun); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, {left: -o.radius, right: o.radius, top: o.radius, bottom: -o.radius, near: 1, far: 60}); sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(0, 0, o.far !== undefined ? Math.sign(o.far) * o.radius * 0.4 : 0); this.group.add(sun, sun.target);
    const pool = new Group(); this.group.add(pool);
    for (let i = 0; i < 140; i++) { const m = new Mesh(cube(2, 2, 2), this.mat(0xffffff)); m.visible = false; pool.add(m); this.parts.push({mesh: m, vel: new Vector3(), life: 0, max: 1, size: 1}); }
    if (o.far !== undefined) this.backdrop(o.far);
  }
  private mat(color: number): MeshBasicMaterial { let m = this.mats.get(color); if (!m) { m = new MeshBasicMaterial({color}); this.mats.set(color, m); } return m; }
  /** Stepped green hills and drifting pixel clouds along the far edge. */
  private backdrop(z: number): void {
    const hill = softMaterial('grass', C.grassDark), white = this.mat(0xffffff);
    [[-22, 112], [-9, 80], [5, 128], [19, 96], [31, 72]].forEach(([x, base]) => { const g = new Group(); for (let i = 0; i < 3; i++) box(g, hill, base - i * 28, 16, base - i * 28, 0, 8 + i * 16, 0, false); g.position.set(x, -0.2, z + Math.sign(z) * 6); this.group.add(g); });
    for (let i = 0; i < 7; i++) {
      const g = new Group(), w = 40 + (i % 3) * 14;
      box(g, white, w, 8, 14, 0, 0, 0, false); box(g, white, w - 16, 7, 12, (i % 2 ? 6 : -6), 7, 0, false);
      g.position.set(-30 + i * 10.5, 9 + (i % 3) * 1.6, z + Math.sign(z) * (3 + (i % 2) * 3)); this.group.add(g); this.clouds.push(g);
    }
  }
  /** A grass slab under everything, top just below y = 0 so terrain tiles and lanes sit on it. */
  ground(w: number, d: number, x = 0, z = 0, color: number = C.grass): Mesh { return this.block(w, 1, d, 'grass', color, x, -0.51, z); }
  /** A box sized in metres with pixel-true UVs. */
  block(w: number, h: number, d: number, kind: MatKind, color: number, x: number, y: number, z: number, parent: Object3D = this.group): Mesh {
    const g = blockGeometry(w, h, d); this.made.push(g); const m = mesh(g, softMaterial(kind, color)); m.position.set(x, y, z); parent.add(m); return m;
  }
  make(id: string, options: BuildOptions = {}): Rig { const def = assetById(id); if (!def) throw new Error(`Unknown asset ${id}`); const r = def.build(options); this.made.push(r); return r; }
  /** Put a rig on the stage: it is drawn and animated from now on. */
  place(r: Rig, x: number, y: number, z: number, ry = 0, parent: Object3D = this.group): Rig { r.group.position.set(x, y, z); r.group.rotation.y = ry; parent.add(r.group); if (!this.rigs.includes(r)) this.rigs.push(r); return r; }
  /** A placed copy of a rig built with make(): shares geometry, animates on its own. */
  clone(src: Rig, x = 0, y = 0, z = 0, ry = 0, parent: Object3D = this.group): Rig { return this.place(cloneRig(src), x, y, z, ry, parent); }
  drop(r: Rig): void { r.group.removeFromParent(); const i = this.rigs.indexOf(r); if (i >= 0) this.rigs.splice(i, 1); this.pulses.delete(r.group); }
  /** Pixel cubes: hits, coins, confetti, rubble. */
  burst(x: number, y: number, z: number, color: number, count = 10, speed = 2.2, size = 1): void {
    let n = 0;
    for (const p of this.parts) {
      if (p.life > 0) continue;
      p.mesh.material = this.mat(color); p.mesh.visible = true; p.mesh.position.set(x, y, z); p.size = size;
      p.vel.set(Math.random() - 0.5, Math.random() * 0.9 + 0.35, Math.random() - 0.5).multiplyScalar(speed * 2); p.life = p.max = 0.5 + Math.random() * 0.4;
      if (++n >= count) break;
    }
  }
  shake(amount: number): void { this.trauma = Math.min(1, this.trauma + amount); }
  /** A quick scale pop that eases back: hit feedback that leaves the object's own scale alone. */
  pulse(o: Object3D, extra = 0.12): void { const p = this.pulses.get(o); if (p) p.extra = extra; else this.pulses.set(o, {base: o.scale.x, extra}); }
  /** Death: a hit pose, a burst in the creature's colour, then it shrinks into the ground and leaves the stage. */
  kill(rig: Rig, color: number): void {
    if (this.dying.some((d) => d.rig === rig)) return;
    const p = rig.group.position; this.pulses.delete(rig.group); setState(rig, 'hit'); this.burst(p.x, rig.height * 0.5, p.z, color, 26, 3.2, 1.6); this.dying.push({rig, t: 0, base: rig.group.scale.x});
  }
  update(dt: number, motion = 1): void {
    this.clock += dt;
    for (const r of this.rigs) { animate(r, dt, motion); for (const a of r.attached ?? []) animate(a, dt, motion); }
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      p.life -= dt; p.vel.y -= 9 * dt; p.mesh.position.addScaledVector(p.vel, dt); p.mesh.rotation.x += dt * 7; p.mesh.rotation.z += dt * 5;
      if (p.mesh.position.y < 0.06 && p.vel.y < 0) { p.mesh.position.y = 0.06; p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      p.mesh.scale.setScalar(p.size * (0.35 + 0.65 * Math.max(0, p.life / p.max))); if (p.life <= 0) p.mesh.visible = false;
    }
    for (const [o, p] of this.pulses) { p.extra *= Math.exp(-dt * 14); o.scale.setScalar(p.base * (1 + p.extra)); if (p.extra < 0.004) { o.scale.setScalar(p.base); this.pulses.delete(o); } }
    for (let i = this.dying.length - 1; i >= 0; i--) { const d = this.dying[i]; d.t += dt; const k = Math.max(0, 1 - d.t / 0.55); d.rig.group.scale.setScalar(d.base * k); d.rig.group.rotation.y += dt * 9; if (k <= 0) { this.drop(d.rig); this.dying.splice(i, 1); } }
    for (const c of this.clouds) { c.position.x += dt * 0.35; if (c.position.x > 38) c.position.x = -38; }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const cam = this.host.camera, s = this.trauma * this.trauma * 0.45, t = this.clock * 37;
    cam.position.set(this.eye.x + Math.sin(t) * s, this.eye.y + Math.sin(t * 1.3 + 2) * s, this.eye.z + Math.sin(t * 0.7 + 4) * s * 0.5); cam.lookAt(this.look);
  }
  dispose(): void {
    this.group.removeFromParent(); for (const r of this.rigs) r.group.removeFromParent(); this.rigs.length = 0;
    for (const m of this.made) m.dispose(); for (const m of this.mats.values()) m.dispose(); this.dying.length = 0; this.pulses.clear();
  }
}
