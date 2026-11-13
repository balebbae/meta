/**
 * Kaijus in the soft-toy style: Moss Slime, Goblin, Cyclops, Stone Giant, Baby Dragon, Elder Dragon.
 * Species, pivot names and states match the animator (rig.ts) and the game scenes; only the look changed.
 */
import {ConeGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshStandardMaterial, Object3D, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector2} from 'three';
import {C} from '../palette';
import {DIFFICULTY} from '../difficulty';
import {makeRig} from '../rig';
import type {AnimState, CreatureKind, Rig, Species, Variant} from '../types';
import {BLUSH, blob, capsule, cutaway, flower, geo, mesh, piv, softBlush, softEyes, softMaterial, softSmile} from './soft';
export {DIFFICULTY, type Difficulty} from '../difficulty';

const SCALE: Record<Variant, number> = {small: 0.78, medium: 1, boss: 1.3};
function finish(group: Group, species: Species, height: number, states: AnimState[], variant: Variant, kind: CreatureKind, base = 1): Rig {
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  group.scale.setScalar(SCALE[variant] * base);
  const rig = makeRig(group, species, pivots, height * SCALE[variant] * base, states);
  rig.dispose = () => { group.removeFromParent(); }; // geometry and materials are shared caches (soft.ts)
  group.userData.creature = {kind, variant, difficulty: DIFFICULTY[kind][variant]};
  return rig;
}
function club(hand: Object3D, len: number, r: number, color: number, spikes = false): void {
  const g = new Group(); g.rotation.z = -2.05; hand.add(g); const wood = softMaterial('wood', color);
  const shaft = mesh(geo(`club:${len}:${r}`, () => new CylinderGeometry(r * 1.7, r, len, 14)), wood); shaft.position.y = len / 2; g.add(shaft);
  blob(g, wood, r * 2, r * 1.7, r * 2, 0, len, 0);
  if (spikes) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, sp = mesh(geo('clubSpike', () => new ConeGeometry(0.018, 0.07, 8)), softMaterial('metal', C.iron)); sp.position.set(Math.cos(a) * r * 1.9, len + r * 0.2, Math.sin(a) * r * 1.9); sp.rotation.set(0, -a, -Math.PI / 2); g.add(sp); }
}
function crown(parent: Object3D, x: number, y: number, z: number, R: number, jewel: number): void {
  const g = new Group(); g.position.set(x, y, z); g.rotation.z = -0.12; parent.add(g); const gold = softMaterial('gold', C.gold);
  g.add(mesh(geo(`crownRing:${R}`, () => { const t = new TorusGeometry(R, R * 0.2, 10, 40); t.rotateX(Math.PI / 2); return t; }), gold));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, s = mesh(geo(`crownSpike:${R}`, () => new ConeGeometry(R * 0.2, R * 0.6, 8)), gold); s.position.set(Math.cos(a) * R, R * 0.4, Math.sin(a) * R); g.add(s); if (i % 2 === 0) blob(g, softMaterial('gloss', jewel), R * 0.16, R * 0.16, R * 0.16, Math.cos(a) * R * 1.05, 0, Math.sin(a) * R * 1.05); }
}
const horn = (parent: Object3D, x: number, y: number, z: number, r: number, h: number, color: number, rx: number, rz: number): void => { const m = mesh(geo(`horn:${r}:${h}`, () => new ConeGeometry(r, h, 12).translate(0, h / 2, 0)), softMaterial('skin', color)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); parent.add(m); };
const wingShape = (): ShapeGeometry => { const s = new Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.1, 0.4, 0.42, 0.38); s.quadraticCurveTo(0.44, 0.22, 0.37, 0.12); s.quadraticCurveTo(0.46, 0.0, 0.34, -0.1); s.quadraticCurveTo(0.18, -0.1, 0, -0.08); s.closePath(); return new ShapeGeometry(s, 12); };

export function buildCreature(kind: CreatureKind, variant: Variant = 'medium'): Rig {
  const boss = variant === 'boss', group = new Group(); group.name = `creature:${kind}:${variant}`;
  const root = piv('root', group, 0, 0, 0);
  const walkers: AnimState[] = ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate'];

  if (kind === 'slime') {
    const col = boss ? C.slimeDark : C.slime, m = softMaterial('slime', col);
    root.add(mesh(geo('slimeDome', () => new LatheGeometry([[0, 0], [0.3, 0], [0.42, 0.07], [0.46, 0.2], [0.45, 0.38], [0.38, 0.54], [0.24, 0.65], [0, 0.7]].map(([r, y]) => new Vector2(r, y)), 40)), m));
    softEyes(root, {x: 0.16, y: 0.42, z: 0.4, w: 0.06, h: 0.085, yaw: 0.35}); softBlush(root, 0.3, 0.33, 0.3, 0.07, 0.04, 0.75); softSmile(root, 0.3, 0.445, 0.045, -0.05, 0.012);
    const n = boss ? 6 : 3; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.4; blob(root, m, 0.075, 0.05, 0.075, Math.cos(a) * 0.44, 0.03, Math.sin(a) * 0.44); }
    flower(root, 0.1, 0.68, 0.1, C.pink, C.gold, 1.1);
    if (boss) crown(root, -0.08, 0.66, -0.06, 0.13, C.crimson);
    return finish(group, 'slime', 0.72, ['idle', 'walk', 'run', 'jump', 'squash', 'attack', 'hit', 'celebrate'], variant, kind);
  }
  if (kind === 'goblin') {
    const skin = softMaterial('skin', C.goblin);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 0.1, 0.24, 0); const lm = mesh(capsule(0.07, 0.1), skin); lm.position.y = -0.12; leg.add(lm); blob(leg, softMaterial('leather', C.leatherDark), 0.085, 0.045, 0.1, 0, -0.22, 0.02); }
    const torso = piv('torso', root, 0, 0.24, 0); blob(torso, skin, 0.25, 0.23, 0.22, 0, 0.2, 0);
    const vest = mesh(geo('goblinVest', () => { const g = new SphereGeometry(1, 28, 20); g.scale(0.27, 0.25, 0.24); return cutaway(g, (x, y, z) => y < 0.17 && y > -0.2 && !(z > 0.1 && Math.abs(x) < 0.12)); }), softMaterial('leather', C.leather)); vest.position.y = 0.2; torso.add(vest);
    const belt = mesh(geo('goblinBelt', () => { const t = new TorusGeometry(0.25, 0.022, 8, 40); t.scale(1, 1, 0.9); t.rotateX(Math.PI / 2); return t; }), softMaterial('leather', C.leatherDark)); belt.position.y = 0.06; torso.add(belt);
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 0.25, 0.32, 0); arm.rotation.z = s * 0.3; const am = mesh(capsule(0.055, 0.16), skin); am.position.y = -0.13; arm.add(am); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -0.26, 0); blob(hand, skin, 0.06, 0.06, 0.06, 0, 0, 0); if (s > 0) club(hand, 0.34, 0.03, C.wood, boss); }
    const head = piv('head', torso, 0, 0.44, 0); blob(head, skin, 0.3, 0.27, 0.28, 0, 0.2, 0);
    for (const s of [-1, 1]) { const ear = blob(head, skin, 0.17, 0.085, 0.045, s * 0.34, 0.3, 0); ear.rotation.z = s * 0.45; const inner = blob(head, softMaterial('skin', 0xf0b7b0), 0.11, 0.05, 0.02, s * 0.35, 0.305, 0.03, false); inner.rotation.z = s * 0.45; }
    softEyes(head, {x: 0.11, y: 0.22, z: 0.25, w: 0.055, h: 0.075}); softBlush(head, 0.2, 0.14, 0.2, 0.07, 0.04, 0.5); softSmile(head, 0.11, 0.27, 0.045, -0.045, 0.012);
    blob(head, softMaterial('skin', C.goblinDark), 0.04, 0.03, 0.035, 0, 0.17, 0.28);
    const fang = mesh(geo('fang', () => new ConeGeometry(0.012, 0.035, 8)), softMaterial('flat', 0xffffff), false); fang.position.set(0.03, 0.085, 0.275); fang.rotation.x = Math.PI; head.add(fang);
    if (boss) { const cap = mesh(geo('goblinCap', () => { const g = new SphereGeometry(1, 28, 20); g.scale(0.33, 0.3, 0.31); return cutaway(g, (_x, y) => y > 0.1); }), softMaterial('metal', C.iron)); cap.position.y = 0.2; head.add(cap); const rim = mesh(geo('goblinRim', () => { const t = new TorusGeometry(0.31, 0.025, 8, 40); t.rotateX(Math.PI / 2); return t; }), softMaterial('metal', C.ironDark)); rim.position.y = 0.3; head.add(rim); }
    const rig = finish(group, 'goblin', 1.12, walkers, variant, kind); rig.scratch.armRest = 1.75; return rig;
  }
  if (kind === 'cyclops') {
    const skin = softMaterial('skin', C.cyclops);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 0.14, 0.32, 0); const lm = mesh(capsule(0.09, 0.14), skin); lm.position.y = -0.16; leg.add(lm); blob(leg, softMaterial('skin', C.cyclopsDark), 0.1, 0.05, 0.12, 0, -0.3, 0.02); }
    const torso = piv('torso', root, 0, 0.32, 0); blob(torso, skin, 0.34, 0.4, 0.3, 0, 0.36, 0);
    torso.add(mesh(geo('loincloth', () => { const l = new LatheGeometry([[0.26, 0.12], [0.31, 0.02], [0.34, -0.1], [0, -0.1]].map(([r, y]) => new Vector2(r, y)), 36); l.scale(1, 1, 0.85); return l; }), softMaterial('leather', C.leather)));
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 0.34, 0.5, 0); arm.rotation.z = s * 0.3; const am = mesh(capsule(0.08, 0.22), skin); am.position.y = -0.17; arm.add(am); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -0.34, 0); blob(hand, skin, 0.085, 0.085, 0.085, 0, 0, 0); if (s > 0) club(hand, 0.46, 0.04, C.woodDark, boss); }
    const head = piv('head', torso, 0, 0.74, 0); blob(head, skin, 0.26, 0.24, 0.25, 0, 0.2, 0);
    softEyes(head, {x: 0, y: 0.22, z: 0.21, w: 0.085, h: 0.085, single: true, white: true}); softBlush(head, 0.19, 0.1, 0.18, 0.06, 0.035, 0.5); softSmile(head, 0.08, 0.25, 0.04, -0.04, 0.011);
    const tooth = mesh(geo('fang', () => new ConeGeometry(0.012, 0.035, 8)), softMaterial('flat', 0xffffff), false); tooth.position.set(-0.025, 0.055, 0.25); head.add(tooth);
    for (const s of [-1, 1]) horn(head, s * 0.16, 0.38, 0, 0.045, boss ? 0.26 : 0.15, C.belly, 0, s * -0.55);
    const rig = finish(group, 'cyclops', 1.46, walkers, variant, kind); rig.scratch.armRest = 1.75; return rig;
  }
  if (kind === 'giant') {
    const rock = softMaterial('stone', C.giant), dark = softMaterial('stone', C.giantDark), moss = softMaterial('cloth', C.moss);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 0.3, 0.6, 0); const lm = mesh(capsule(0.2, 0.2), dark); lm.position.y = -0.3; leg.add(lm); }
    const torso = piv('torso', root, 0, 0.6, 0); blob(torso, rock, 0.64, 0.56, 0.52, 0, 0.48, 0);
    for (const [x, y, z, w] of [[-0.36, 0.95, 0.08, 0.24], [0.3, 0.98, -0.1, 0.2], [0.05, 0.9, 0.42, 0.16]]) blob(torso, moss, w, 0.07, w * 0.8, x, y, z);
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 0.68, 0.8, 0); arm.rotation.z = s * 0.25; const am = mesh(capsule(0.14, 0.34), rock); am.position.y = -0.3; arm.add(am); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -0.62, 0); blob(hand, dark, 0.18, 0.16, 0.18, 0, 0.02, 0); }
    if (boss) for (const s of [-1, 1]) { blob(torso, rock, 0.28, 0.24, 0.26, s * 0.72, 0.9, 0); blob(torso, moss, 0.18, 0.06, 0.15, s * 0.72, 1.12, 0.02); }
    const head = piv('head', torso, 0, 1.02, 0); blob(head, rock, 0.42, 0.38, 0.4, 0, 0.34, 0);
    softEyes(head, {x: 0.15, y: 0.4, z: 0.37, w: 0.06, h: 0.08}); softBlush(head, 0.27, 0.3, 0.3, 0.07, 0.04, 0.6); softSmile(head, 0.26, 0.4, 0.06, -0.06, 0.013);
    blob(head, moss, 0.3, 0.1, 0.28, 0.05, 0.7, -0.02); flower(head, 0.12, 0.75, 0.08, C.pink, C.gold, 1.6); if (boss) flower(head, -0.18, 0.72, 0.02, C.white, C.gold, 1.3);
    const rig = finish(group, 'giant', 2.36, ['idle', 'walk', 'jump', 'attack', 'stomp', 'hit', 'celebrate'], variant, kind); rig.scratch.armRest = 0.3; return rig;
  }
  // dragons: built at baby proportions, the elder is the same body scaled up with longer horns, back spikes and bigger wings
  const elder = kind === 'elderDragon', k = elder ? 1.55 : 1;
  const col = elder ? C.dragonElder : C.dragonBaby, dk = elder ? C.dragonElderDark : C.dragonBabyDark, bellyC = elder ? C.bellyGold : C.belly;
  const sc = softMaterial('scale', col), scd = softMaterial('scale', dk);
  for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 0.15, 0.2, 0.05); const lm = mesh(capsule(0.07, 0.06), sc); lm.position.y = -0.09; leg.add(lm); blob(leg, scd, 0.09, 0.045, 0.11, 0, -0.18, 0.03); }
  blob(root, sc, 0.3, 0.3, 0.32, 0, 0.42, 0); blob(root, softMaterial('skin', bellyC), 0.2, 0.24, 0.06, 0, 0.38, 0.27);
  const tail = piv('tail', root, 0, 0.36, -0.26); const tm = mesh(geo('dragonTail', () => new ConeGeometry(0.1, 0.5, 14).translate(0, 0.25, 0).rotateX(-Math.PI / 2)), sc); tm.rotation.x = 0.5; tail.add(tm); const tip = blob(tail, scd, 0.07, 0.06, 0.05, 0, 0.24, -0.44); void tip;
  for (const s of [-1, 1]) { const wing = piv(s < 0 ? 'wingL' : 'wingR', root, s * 0.2, 0.56, -0.08); const wm = mesh(geo('wing', wingShape), new MeshStandardMaterial({color: dk, roughness: 0.85, side: DoubleSide})); const ws = elder ? 1.6 : 1; wm.scale.set(s * ws, ws, 1); wm.rotation.y = s * 0.35; wing.add(wm); }
  for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', root, s * 0.28, 0.44, 0.12); arm.rotation.set(-0.6, 0, s * 0.6); const am = mesh(capsule(0.05, 0.06), sc); am.position.y = -0.07; arm.add(am); }
  const head = piv('head', root, 0, 0.64, 0.12); blob(head, sc, 0.3, 0.27, 0.28, 0, 0.2, 0); blob(head, sc, 0.17, 0.12, 0.13, 0, 0.1, 0.26);
  for (const s of [-1, 1]) blob(head, scd, 0.018, 0.014, 0.012, s * 0.05, 0.14, 0.375, false);
  softEyes(head, {x: 0.13, y: 0.27, z: 0.24, w: 0.055, h: 0.08}); softBlush(head, 0.23, 0.17, 0.16, 0.06, 0.035, 0.5); softSmile(head, 0.06, 0.375, 0.045, -0.04, 0.011);
  for (const s of [-1, 1]) horn(head, s * 0.12, 0.42, -0.04, 0.04, elder ? 0.26 : 0.12, bellyC, -0.5, s * -0.25);
  const flame = piv('flame', head, 0, 0.08, 0.4); flame.scale.setScalar(0.01); const fm = mesh(geo('flame', () => new ConeGeometry(0.06, 0.24, 12).translate(0, 0.12, 0).rotateX(Math.PI / 2)), softMaterial('glow', C.flame), false); flame.add(fm); blob(flame, softMaterial('glow', C.flameCore), 0.035, 0.035, 0.08, 0, 0, 0.08, false);
  if (elder) for (const [y, z] of [[0.7, -0.04], [0.63, -0.18], [0.52, -0.3]]) horn(root, 0, y, z, 0.035, 0.11, bellyC, -0.9, 0);
  return finish(group, 'dragon', 1.1, ['idle', 'walk', 'run', 'jump', 'flap', 'puff', 'attack', 'hit', 'celebrate'], variant, kind, k);
}
void BLUSH;
