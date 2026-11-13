/**
 * Kaijus in the pixel style: Moss Slime, Goblin, Cyclops, Stone Giant, Baby Dragon, Elder Dragon. They are the monsters:
 * glowing eyes under slanted brows, teeth, no smile and no blush, and every one of them stands taller than a hero.
 * Species, pivot names and states match the animator (rig.ts) and the game scenes. Sizes and positions are in px (soft.ts).
 */
import {Group, Mesh, Object3D} from 'three';
import {C, shade} from '../palette';
import {DIFFICULTY} from '../difficulty';
import {makeRig} from '../rig';
import type {AnimState, CreatureKind, Rig, Species, Variant} from '../types';
import {EYE_INK, INK, PX, box, decal, piv, softMaterial} from './soft';
export {DIFFICULTY, type Difficulty} from '../difficulty';

const M = softMaterial;
/** How much each kind is blown up from its px build, Minecraft-giant style: a hero is 29 px (1.8 m) and even a small kaiju is at least that tall. */
const SIZE: Record<CreatureKind, number> = {slime: 2.8, goblin: 1.9, cyclops: 1.7, giant: 1.5, babyDragon: 1.9, elderDragon: 3.2};
const SCALE: Record<Variant, number> = {small: 0.85, medium: 1, boss: 1.35};
/** The size sits on an inner group so scenes stay free to set `group.scale` (hit pulses, death shrink, a rider-sized goblin: divide by userData.creature.scale). */
function finish(group: Group, species: Species, heightPx: number, states: AnimState[], variant: Variant, kind: CreatureKind): Rig {
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const scale = SIZE[kind] * SCALE[variant]; group.children[0].scale.setScalar(scale);
  const rig = makeRig(group, species, pivots, heightPx * PX * scale, states);
  rig.dispose = () => { group.removeFromParent(); }; // geometry and materials are shared caches (soft.ts)
  group.userData.creature = {kind, variant, difficulty: DIFFICULTY[kind][variant], scale};
  return rig;
}
/** Mean eyes: a glowing block with a slit pupil under a slanted brow. Pivots are eyeL/eyeR (or eye) so they still blink; the brows do not. */
function glare(parent: Object3D, x: number, y: number, z: number, color: number, h = 2, single = false): void {
  const ink = M('eye', EYE_INK), w = single ? 4 : 3, top = y + h / 2;
  for (const s of single ? [0] : [-1, 1]) {
    const eye = piv(single ? 'eye' : s < 0 ? 'eyeL' : 'eyeR', parent, s * x, y, z);
    decal(eye, M('glow', color), w, h, 0, 0, 0); decal(eye, ink, single ? 2 : 1, h - 1, 0, -0.5, 0, 1);
    if (!single) { decal(parent, ink, 2, 1, s * (x + 0.5), top + 0.5, z, 2); decal(parent, ink, 2, 1, s * (x - 1.5), top - 0.5, z, 2); } // outer half high, inner half low
  }
  if (single) { for (const s of [-1, 1]) decal(parent, ink, 2, 1, s * 2, top + 0.5, z, 2); decal(parent, ink, 2, 1, 0, top - 0.5, z, 2); }
}
/** A snarl: a dark mouth two rows deep, corners pulled down, jagged teeth. `y` is the top row. */
function snarl(parent: Object3D, y: number, z: number, w = 4): void {
  const ink = M('flat', INK), tooth = M('flat', 0xfff4dc);
  decal(parent, ink, w, 2, 0, y - 0.5, z);
  for (const s of [-1, 1]) { decal(parent, ink, 1, 1, s * (w / 2 + 0.5), y - 1, z); for (let i = 0; i < w / 2; i++) decal(parent, tooth, 1, 1, s * (w / 2 - 0.5 - i), y - (i % 2), z, 1); }
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
  const boss = variant === 'boss', group = new Group(), body = new Group(); group.name = `creature:${kind}:${variant}`; group.add(body);
  const root = piv('root', body, 0, 0, 0);
  const walkers: AnimState[] = ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate'];

  if (kind === 'slime') {
    const col = boss ? C.slimeDark : C.slime, m = M('slime', col);
    box(root, M('skin', shade(col, 0.8)), 10, 7, 10, 0, 4.5, 0); box(root, m, 14, 11, 14, 0, 5.5, 0); // a darker core inside a see-through cube, the classic
    glare(root, 3.5, 7, 7, 0xffe14a); snarl(root, 4.5, 7, 6);
    const n = boss ? 6 : 3; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.4; box(root, m, 2, 1, 2, Math.round(Math.cos(a) * 8), 0.5, Math.round(Math.sin(a) * 8)); }
    if (boss) crown(root, 0, 11, 0, 6, C.crimson); else for (const z of [3, 0, -3]) box(root, M('skin', shade(col, 0.6)), 2, 2, 2, 0, 12, z); // dorsal spikes
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
    for (const s of [-1, 1]) { box(head, skin, 3, 2, 1, s * 6.5, 6, 0); box(head, skin, 2, 1, 1, s * 9, 6.5, 0); decal(head, M('flat', C.goblinDark), 2, 1, s * 6.5, 6, 0.5); }
    glare(head, 2.5, 5, 4.5, 0xffd23f); snarl(head, 2.5, 4.5, 6);
    box(head, M('skin', C.goblinDark), 2, 1, 1, 0, 3.5, 4.5);
    if (boss) { box(head, M('metal', C.iron), 11, 3, 10, 0, 9.5, 0); box(head, M('metal', C.ironDark), 12, 1, 11, 0, 8.5, 0); }
    const rig = finish(group, 'goblin', 20, walkers, variant, kind); rig.scratch.armRest = 1.75; return rig;
  }
  if (kind === 'cyclops') {
    const skin = M('skin', C.cyclops);
    for (const s of [-1, 1]) { const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 2.5, 5, 0); box(leg, skin, 3, 5, 3, 0, -2.5, 0); box(leg, M('skin', C.cyclopsDark), 4, 1, 4, 0, -4.5, 0.5); }
    const torso = piv('torso', root, 0, 5, 0); box(torso, skin, 11, 12, 9, 0, 6, 0); box(torso, M('leather', C.leather), 12, 3, 10, 0, 1.5, 0);
    for (const s of [-1, 1]) { const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 7, 10.5, 0); arm.rotation.z = s * 0.3; box(arm, skin, 3, 8, 3, 0, -3.5, 0); const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -7, 0); if (s > 0) club(hand, 8, C.woodDark, boss); }
    const head = piv('head', torso, 0, 12, 0); box(head, skin, 8, 8, 8, 0, 4, 0);
    glare(head, 0, 4.5, 4, 0xff4a3a, 3, true); snarl(head, 1.5, 4);
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
    glare(head, 3, 7, 6.5, 0xff7a1a); snarl(head, 3.5, 6.5, 5);
    box(head, moss, 10, 2, 9, 1, 13, 0);
    const rig = finish(group, 'giant', 41, ['idle', 'walk', 'jump', 'attack', 'stomp', 'hit', 'celebrate'], variant, kind); rig.scratch.armRest = 0.3; return rig;
  }
  // dragons: one body; the elder is the same build blown up further (SIZE) with longer horns, back spikes and bigger wings
  const elder = kind === 'elderDragon';
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
  glare(head, 2.5, 6, 4.5, elder ? 0xff3b2f : 0xffd23f); snarl(head, 1.5, 6.5);
  for (const s of [-1, 1]) horn(head, s * 3, 9, -2, elder ? 4 : 2, bellyC, s * 0.5);
  const flame = piv('flame', head, 0, 1.5, 7); flame.scale.setScalar(0.01);
  box(flame, M('glow', C.flame), 3, 3, 3, 0, 0, 1.5, false); box(flame, M('glow', C.flame), 2, 2, 2, 0, 0, 4, false); box(flame, M('glow', C.flameCore), 1, 1, 2, 0, 0, 6, false);
  if (elder) for (const z of [2, -1, -4]) box(root, M('skin', bellyC), 1, 2, 2, 0, 13, z);
  return finish(group, 'dragon', 20, ['idle', 'walk', 'run', 'jump', 'flap', 'puff', 'attack', 'hit', 'celebrate'], variant, kind);
}
