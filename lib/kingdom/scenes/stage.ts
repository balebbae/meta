/**
 * The stage every mini game stands on: plain three, no React, so the app (an R3F wrapper) and the character sheet run the
 * same scenes. A Stage owns the group, the lights, sky dressing, the rigs it animates, pixel-cube particles, scale pulses,
 * death pops and a camera with shake. Scenes set `eye` and `look`; `update(dt)` does the rest.
 */
import {CanvasTexture, DirectionalLight, Group, HemisphereLight, type Material, Mesh, MeshBasicMaterial, Object3D, type PerspectiveCamera, SRGBColorSpace, Sprite, SpriteMaterial, Vector3} from 'three';
import {assetById} from '../catalog';
import {C} from '../palette';
import {animate, cloneRig, setState} from '../rig';
import {blockGeometry, box, cube, mesh, softMaterial, type MatKind} from '../factories/soft';
import type {BuildOptions, HeroPreset, Rig} from '../types';
import type {Input, Phase} from '../games/common';
import {WORLDS, tint, type World, type WorldId} from './worlds';

export type Hud = {phase: Phase; score: number; message: string; left: string; right: string};
export type Host = {camera: PerspectiveCamera; hero?: Partial<HeroPreset>; /** Where the game is set (worlds.ts); the kingdom when left out. */ world?: WorldId};
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
  private readonly drift: {o: Object3D; vx: number; vy: number}[] = [];
  readonly world: World;
  private swept = -1;
  private readonly floats: {sprite: Sprite; life: number; max: number}[] = [];
  private readonly made: {dispose: () => void}[] = [];
  private trauma = 0;
  private clock = 0;

  constructor(readonly host: Host, o: StageOpts) {
    this.world = WORLDS[host.world ?? 'kingdom'] ?? WORLDS.kingdom;
    host.camera.fov = o.fov; host.camera.updateProjectionMatrix();
    this.group.add(new HemisphereLight(this.world.light.sky, this.world.light.ground, 0.95)); // a pale bounce: a saturated green one tints every stone underside
    const sun = new DirectionalLight(this.world.light.sun, 2.5); sun.position.set(...o.sun); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, {left: -o.radius, right: o.radius, top: o.radius, bottom: -o.radius, near: 1, far: Math.max(60, o.radius * 5)}); sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(0, 0, o.far !== undefined ? Math.sign(o.far) * o.radius * 0.4 : 0); this.group.add(sun, sun.target);
    const pool = new Group(); this.group.add(pool);
    for (let i = 0; i < 140; i++) { const m = new Mesh(cube(2, 2, 2), this.mat(0xffffff)); m.visible = false; pool.add(m); this.parts.push({mesh: m, vel: new Vector3(), life: 0, max: 1, size: 1}); }
    if (o.far !== undefined) this.backdrop(o.far);
  }
  private mat(color: number): MeshBasicMaterial { let m = this.mats.get(color); if (!m) { m = new MeshBasicMaterial({color}); this.mats.set(color, m); } return m; }
  /** The sky colour of this stage's world: scenes hand it out as their background. */
  get sky(): number { return this.world.sky; }
  /** A colour as this world shows it. */
  tint(kind: MatKind, color: number): number { return tint(this.world, kind, color); }
  /** Recolour everything under `o` for this world. Heroes and mounts (noTone) are left alone; under a kaiju only the hide changes. */
  private tone(o: Object3D, creature = false): void {
    if (o.userData.noTone) return;
    const kaiju = creature || Boolean(o.userData.creature), m = o as Mesh;
    if (m.isMesh && !m.userData.toned) {
      m.userData.toned = true;
      const swap = (mat: Material): Material => { const s = mat.userData.soft as {kind: MatKind; color: number} | undefined; return s ? softMaterial(s.kind, tint(this.world, s.kind, s.color, kaiju)) : mat; };
      m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
    }
    for (const ch of o.children) this.tone(ch, kaiju);
  }
  /** Stepped hills and the world's weather along the far edge: clouds, stars and a planet, bubbles or snow. */
  private backdrop(z: number): void {
    const hill = softMaterial('grass', C.grassDark), white = this.mat(0xffffff), w = this.world.weather, side = Math.sign(z), rnd = (i: number, k: number): number => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
    [[-22, 112], [-9, 80], [5, 128], [19, 96], [31, 72]].forEach(([x, base]) => { const g = new Group(); for (let i = 0; i < 3; i++) box(g, hill, base - i * 28, 16, base - i * 28, 0, 8 + i * 16, 0, false); g.position.set(x, -0.2, z + Math.sign(z) * 6); this.group.add(g); });
    if (w === 'clouds') for (let i = 0; i < 7; i++) {
      const g = new Group(), cw = 40 + (i % 3) * 14;
      box(g, white, cw, 8, 14, 0, 0, 0, false); box(g, white, cw - 16, 7, 12, (i % 2 ? 6 : -6), 7, 0, false);
      g.position.set(-30 + i * 10.5, 9 + (i % 3) * 1.6, z + side * (3 + (i % 2) * 3)); this.group.add(g); this.drift.push({o: g, vx: 0.35, vy: 0});
    }
    else for (let i = 0; i < (w === 'bubbles' ? 26 : 70); i++) { // stars hang behind the hills; bubbles rise and snow falls over the whole stage
      const dot = new Mesh(cube(w === 'stars' ? 1 + (i % 2) : 2, w === 'stars' ? 1 + (i % 2) : 2, 1), white), depth = w === 'stars' ? z + side * (5 + rnd(i, 3) * 6) : z * (0.1 + rnd(i, 3) * 0.95);
      dot.position.set(-36 + rnd(i, 1) * 72, 0.4 + rnd(i, 2) * (w === 'stars' ? 20 : 15), depth); this.group.add(dot);
      if (w !== 'stars') this.drift.push({o: dot, vx: (rnd(i, 4) - 0.5) * 0.5, vy: w === 'bubbles' ? 0.5 + rnd(i, 5) * 0.6 : -(0.7 + rnd(i, 5) * 0.8)});
    }
    if (w === 'stars') { // a ringed planet low on the horizon
      const g = new Group(), body = this.mat(0xffb36b), ring = this.mat(0xfff1c9);
      box(g, body, 40, 24, 6, 0, 0, 0, false); box(g, body, 24, 40, 6, 0, 0, 0, false); box(g, body, 34, 34, 6, 0, 0, 0, false); box(g, ring, 72, 4, 8, 0, 0, 0, false).rotation.z = 0.3;
      g.position.set(-7, 8.2, z + side * 9); this.group.add(g);
    }
  }
  /** A grass slab under everything, top just below y = 0 so terrain tiles and lanes sit on it. */
  ground(w: number, d: number, x = 0, z = 0, color: number = C.grass): Mesh { return this.block(w, 1, d, 'grass', color, x, -0.51, z); }
  /** A box sized in metres with pixel-true UVs. */
  block(w: number, h: number, d: number, kind: MatKind, color: number, x: number, y: number, z: number, parent: Object3D = this.group): Mesh {
    const g = blockGeometry(w, h, d); this.made.push(g); const m = mesh(g, softMaterial(kind, tint(this.world, kind, color))); m.userData.toned = true; m.position.set(x, y, z); parent.add(m); return m;
  }
  make(id: string, options: BuildOptions = {}): Rig { const def = assetById(id); if (!def) throw new Error(`Unknown asset ${id}`); const r = def.build(options); this.made.push(r); return r; }
  /** Put a rig on the stage: it is drawn and animated from now on. */
  place(r: Rig, x: number, y: number, z: number, ry = 0, parent: Object3D = this.group): Rig {
    if (r.species === 'hero' || r.species === 'avatar' || r.species === 'pony') r.group.userData.noTone = true; else this.tone(r.group);
    r.group.position.set(x, y, z); r.group.rotation.y = ry; parent.add(r.group); if (!this.rigs.includes(r)) this.rigs.push(r); return r; }
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
  /** A text sprite: name tags, damage numbers. With `life` (seconds) it floats up and fades out. */
  text(str: string, x: number, y: number, z: number, o: {color?: string; size?: number; life?: number; parent?: Object3D} = {}): Sprite | null {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'), g = c.getContext('2d')!, font = '800 56px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    g.font = font; c.width = Math.ceil(g.measureText(str).width) + 28; c.height = 80;
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#1b1518'; g.strokeText(str, c.width / 2, 42); g.fillStyle = o.color ?? '#ffffff'; g.fillText(str, c.width / 2, 42);
    const map = new CanvasTexture(c); map.colorSpace = SRGBColorSpace;
    const sprite = new Sprite(new SpriteMaterial({map, transparent: true, depthTest: false})), size = o.size ?? 0.5;
    sprite.scale.set((c.width / c.height) * size, size, 1); sprite.position.set(x, y, z); sprite.renderOrder = 10; (o.parent ?? this.group).add(sprite);
    if (o.life) this.floats.push({sprite, life: o.life, max: o.life}); else this.made.push({dispose: () => { map.dispose(); sprite.material.dispose(); }});
    return sprite;
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
    for (let i = this.floats.length - 1; i >= 0; i--) { const f = this.floats[i]; f.life -= dt; f.sprite.position.y += dt * 1.3; f.sprite.material.opacity = Math.min(1, (f.life / f.max) * 2.2); if (f.life <= 0) { f.sprite.removeFromParent(); f.sprite.material.map?.dispose(); f.sprite.material.dispose(); this.floats.splice(i, 1); } }
    for (const d of this.drift) { const p = d.o.position; p.x += dt * d.vx; p.y += dt * d.vy; if (p.x > 38) p.x = -38; else if (p.x < -38) p.x = 38; if (p.y > 16) p.y = 0.3; else if (p.y < 0.2) p.y = 16; }
    // things a scene builds by hand (tiles, keeps, lanes) are recoloured here: twice a second is plenty and costs a walk of a few hundred objects
    if (this.world.id !== 'kingdom' && this.clock - this.swept > 0.5) { this.swept = this.clock; this.tone(this.group); }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const cam = this.host.camera, s = this.trauma * this.trauma * 0.45, t = this.clock * 37;
    cam.position.set(this.eye.x + Math.sin(t) * s, this.eye.y + Math.sin(t * 1.3 + 2) * s, this.eye.z + Math.sin(t * 0.7 + 4) * s * 0.5); cam.lookAt(this.look);
  }
  dispose(): void {
    this.group.removeFromParent(); for (const r of this.rigs) r.group.removeFromParent(); this.rigs.length = 0;
    for (const m of this.made) m.dispose(); for (const m of this.mats.values()) m.dispose(); this.dying.length = 0; this.pulses.clear();
    for (const f of this.floats) { f.sprite.material.map?.dispose(); f.sprite.material.dispose(); } this.floats.length = 0;
  }
}
