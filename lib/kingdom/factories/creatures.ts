/**
 * Kaijus in the pixel style: Moss Slime, Goblin, Cyclops, Stone Giant, Baby Dragon, Elder Dragon.
 * Species, pivot names and states match the animator (rig.ts) and the game scenes. Sizes and positions are in px (soft.ts).
 */
import {Group, Mesh, Object3D} from 'three';
import {C, shade} from '../palette';
import {DIFFICULTY} from '../difficulty';
import {makeRig} from '../rig';
import type {AnimState, CreatureKind, Rig, Species, Variant} from '../types';
import {PX, blush, box, decal, eyes, flower, piv, smile, softMaterial} from './soft';
export {DIFFICULTY, type Difficulty} from '../difficulty';

const M = softMaterial;
const SCALE: Record<Variant, number> = {small: 0.78, medium: 1, boss: 1.3};
function finish(group: Group, species: Species, heightPx: number, states: AnimState[], variant: Variant, kind: CreatureKind, base = 1): Rig {
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  group.scale.setScalar(SCALE[variant] * base);
  const rig = makeRig(group, species, pivots, heightPx * PX * SCALE[variant] * base, states);
  rig.dispose = () => { group.removeFromParent(); }; // geometry and materials are shared caches (soft.ts)
  group.userData.creature = {kind, variant, difficulty: DIFFICULTY[kind][variant]};
  return rig;
}
function club(hand: Object3D, len: number, color: number, spikes = false): void {
  const g = new Group(); g.rotation.z = -2.05; hand.add(g); const wood = M('wood', color);
  box(g, wood, 1, len, 1, 0, len / 2, 0); box(g, wood, 3, 3, 3, 0, len + 0.5, 0);
  if (spikes) for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) box(g, M('metal', C.iron), 1, 1, 1, x, len + 0.5, z);
}
function crown(parent: Object3D, x: number, y: number, z: number, side: number, jewel: number): void {
  const gold = M('gold', C.gold), e = (side - 1) / 2; box(parent, gold, side, 1, side, x, y + 0.5, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(parent, gold, 1, 1, 1, x + sx * e, y + 1.5, z + sz * e);
  box(parent, M('gloss', jewel), 1, 1, 0.4, x, y + 0.5, z + side / 2 + 0.1);
}
/** A stepped horn: a 2 px base and a 1 px tip that leans `lean` px sideways. */
const horn = (parent: Object3D, x: number, y: number, z: number, len: number, color: number, lean: number): void => { const m = M('skin', color); box(parent, m, 2, 2, 2, x, y + 1, z); box(parent, m, 1, len, 1, x + lean, y + 2 + len / 2, z); };

export function buildCreature(kind: CreatureKind, variant: Variant = 'medium'): Rig {
  const boss = variant === 'boss', group = new Group(); group.name = `creature:${kind}:${variant}`;
  const root = piv('root', group, 0, 0, 0);
  const walkers: AnimState[] = ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate'];

  if (kind === 'slime') {
    const col = boss ? C.slimeDark : C.slime, m = M('slime', col);
    box(root, M('skin', shade(col, 0.8)), 10, 7, 10, 0, 4.5, 0); box(root, m, 14, 11, 14, 0, 5.5, 0); // a darker core inside a see-through cube, the classic
    eyes(root, {x: 3, y: 6.5, z: 7}); blush(root, 5, 4.5, 7); smile(root, 4.5, 7);
    const n = boss ? 6 : 3; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.4; box(root, m, 2, 1, 2, Math.round(Math.cos(a) * 8), 0.5, Math.round(Math.sin(a) * 8)); }
    flower(root, 2, 11, 2, C.pink, C.gold);
    if (boss) crown(root, -3, 11, -2, 5, C.crimson);
    return finish(group, 'slime', 12, ['idle', 'walk', 'run', 'jump', 'squash', 'attack', 'hit', 'celebrate'], variant, kind);
  }
  if (kind === 'goblin') {
    const skin = M('skin', C.goblin), leather = M('leather', C.leather);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 2, 4, 0); box(leg, skin, 2, 4, 2, 0, -2, 0); box(leg, M('leather', C.leatherDark), 3, 1, 4, 0, -3.5, 0.5); }
    const torso = piv('torso', root, 0, 4, 0); box(torso, skin, 8, 7, 6, 0, 3.5, 0);
    for (const s of [-1, 1]) box(torso, leather, 3, 4, 7, s * 3, 4, 0); // an open vest
    box(torso, M('leather', C.leatherDark), 9, 1, 7, 0, 1.5, 0);
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 5, 6, 0); arm.rotation.z = s * 0.3; box(arm, skin, 2, 5, 2, 0, -2, 0); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -4, 0); if (s > 0) club(hand, 6, C.wood, boss); }
    const head = piv('head', torso, 0, 7, 0); box(head, skin, 10, 9, 9, 0, 4.5, 0);
    for (const s of [-1, 1]) { box(head, skin, 3, 2, 1, s * 6.5, 6, 0); box(head, skin, 2, 1, 1, s * 9, 6.5, 0); decal(head, M('flat', 0xf0b7b0), 2, 1, s * 6.5, 6, 0.5); }
    eyes(head, {x: 2.5, y: 5, z: 4.5, h: 2}); blush(head, 4, 3.5, 4.5); smile(head, 2.5, 4.5);
    box(head, M('skin', C.goblinDark), 2, 1, 1, 0, 3.5, 4.5); decal(head, M('flat', 0xffffff), 1, 1, 0.5, 0.5, 4.5);
    if (boss) { box(head, M('metal', C.iron), 11, 3, 10, 0, 9.5, 0); box(head, M('metal', C.ironDark), 12, 1, 11, 0, 8.5, 0); }
    const rig = finish(group, 'goblin', 20, walkers, variant, kind); rig.scratch.armRest = 1.75; return rig;
  }
  if (kind === 'cyclops') {
    const skin = M('skin', C.cyclops);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 2.5, 5, 0); box(leg, skin, 3, 5, 3, 0, -2.5, 0); box(leg, M('skin', C.cyclopsDark), 4, 1, 4, 0, -4.5, 0.5); }
    const torso = piv('torso', root, 0, 5, 0); box(torso, skin, 11, 12, 9, 0, 6, 0); box(torso, M('leather', C.leather), 12, 3, 10, 0, 1.5, 0);
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 7, 10.5, 0); arm.rotation.z = s * 0.3; box(arm, skin, 3, 8, 3, 0, -3.5, 0); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -7, 0); if (s > 0) club(hand, 8, C.woodDark, boss); }
    const head = piv('head', torso, 0, 12, 0); box(head, skin, 8, 8, 8, 0, 4, 0);
    eyes(head, {x: 0, y: 4.5, z: 4, h: 2, single: true, white: true}); blush(head, 3.5, 2, 4, 1); smile(head, 1.5, 4);
    decal(head, M('flat', 0xffffff), 1, 1, -0.5, 0.5, 4, 1);
    for (const s of [-1, 1]) horn(head, s * 3, 8, 0, boss ? 4 : 2, C.belly, s * 0.5);
    const rig = finish(group, 'cyclops', 26, walkers, variant, kind); rig.scratch.armRest = 1.75; return rig;
  }
  if (kind === 'giant') {
    const rock = M('rock', C.giant), dark = M('rock', C.giantDark), moss = M('grass', C.moss);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 5, 10, 0); box(leg, dark, 6, 10, 6, 0, -5, 0); }
    const torso = piv('torso', root, 0, 10, 0); box(torso, rock, 20, 17, 16, 0, 8.5, 0);
    for (const [x, z, w, d] of [[-6, 1, 7, 6], [5, -2, 6, 5], [1, 6, 5, 3]]) box(torso, moss, w, 1, d, x, 17.5, z);
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 12.5, 14, 0); arm.rotation.z = s * 0.25; box(arm, rock, 5, 11, 5, 0, -4.5, 0); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -10, 0); box(hand, dark, 6, 5, 6, 0, -1, 0); }
    if (boss) for (const s of [-1, 1]) { box(torso, rock, 9, 7, 9, s * 12, 17, 0); box(torso, moss, 6, 1, 5, s * 12, 21, 0); }
    const head = piv('head', torso, 0, 17, 0); box(head, rock, 13, 12, 13, 0, 6, 0);
    eyes(head, {x: 3, y: 6.5, z: 6.5}); blush(head, 5, 4.5, 6.5); smile(head, 4.5, 6.5);
    box(head, moss, 10, 2, 9, 1, 13, 0); flower(head, 2, 14, 1, C.pink, C.gold, 2); if (boss) flower(head, -3, 14, -1, C.white, C.gold);
    const rig = finish(group, 'giant', 41, ['idle', 'walk', 'jump', 'attack', 'stomp', 'hit', 'celebrate'], variant, kind); rig.scratch.armRest = 0.3; return rig;
  }
  // dragons: built at baby proportions, the elder is the same body scaled up with longer horns, back spikes and bigger wings
  const elder = kind === 'elderDragon', k = elder ? 1.55 : 1;
  const col = elder ? C.dragonElder : C.dragonBaby, dk = elder ? C.dragonElderDark : C.dragonBabyDark, bellyC = elder ? C.bellyGold : C.belly;
  const sc = M('scale', col), scd = M('scale', dk);
  for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 2.5, 3, 1); box(leg, sc, 2, 3, 2, 0, -1.5, 0); box(leg, scd, 3, 1, 4, 0, -2.5, 0.5); }
  box(root, sc, 10, 10, 10, 0, 7, 0); box(root, M('skin', bellyC), 6, 7, 1, 0, 6, 5);
  const tail = piv('tail', root, 0, 5, -5); box(tail, sc, 4, 4, 3, 0, 0, -1.5); box(tail, sc, 3, 3, 3, 0, 0.5, -4.5); box(tail, sc, 2, 2, 3, 0, 1, -7.5); box(tail, scd, 3, 3, 2, 0, 1.5, -10);
  for (const s of [-1, 1]) {
    const wing = piv(s < 0 ? 'wingL' : 'wingR', root, s * 4, 9, -3), fan = new Group(); fan.rotation.y = s * 0.35; wing.add(fan);
    for (const [w, h, x, y] of elder ? [[6, 10, 3, 2], [3, 9, 7.5, 3.5], [3, 6, 10.5, 5]] : [[4, 7, 2, 1.5], [2, 6, 5, 2.5], [2, 4, 7, 3.5]]) box(fan, scd, w, h, 1, s * x, y, 0); // three stepped slabs
  }
  for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', root, s * 5, 7.5, 2); arm.rotation.set(-0.6, 0, s * 0.6); box(arm, sc, 2, 3, 2, 0, -1, 0); }
  const head = piv('head', root, 0, 9.5, 2); box(head, sc, 10, 9, 9, 0, 4.5, 0); box(head, sc, 6, 4, 2, 0, 2, 5.5);
  for (const s of [-1, 1]) decal(head, M('flat', dk), 1, 1, s * 1.5, 3, 6.5);
  eyes(head, {x: 3, y: 6, z: 4.5}); blush(head, 4, 3, 4.5); smile(head, 1.5, 6.5);
  for (const s of [-1, 1]) horn(head, s * 3, 9, -2, elder ? 4 : 2, bellyC, s * 0.5);
  const flame = piv('flame', head, 0, 1.5, 7); flame.scale.setScalar(0.01);
  box(flame, M('glow', C.flame), 3, 3, 3, 0, 0, 1.5, false); box(flame, M('glow', C.flame), 2, 2, 2, 0, 0, 4, false); box(flame, M('glow', C.flameCore), 1, 1, 2, 0, 0, 6, false);
  if (elder) for (const z of [2, -1, -4]) box(root, M('skin', bellyC), 1, 2, 2, 0, 13, z);
  return finish(group, 'dragon', 20, ['idle', 'walk', 'run', 'jump', 'flap', 'puff', 'attack', 'hit', 'celebrate'], variant, kind, k);
}
