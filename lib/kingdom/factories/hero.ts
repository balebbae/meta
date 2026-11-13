/**
 * The base avatar in the pixel style: an 18 px cube head on a 6 px body, 29 px (1.8 m) tall, gender neutral, with costumes
 * layered on named slots (hat, torso wear, cape, hands). Every size and position below is in px (1/16 m); see soft.ts.
 * Worn layers are 1 px larger than what they cover, like Minecraft's armour layer.
 */
import {Group, Mesh, Object3D} from 'three';
import {PX, box, decal, disposeSoftResources, piv, smile, softMaterial, type MatKind} from './soft';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import type {AnimState, Expression, Gender, HeroPreset, Rig, Royal, Tier} from '../types';

export const AVATAR_HEIGHT = 29 * PX;
export const SKIN_TONES: readonly number[] = C.skin;
export const HAIR_COLORS = [C.hairBrown, C.hairAuburn, C.hairBlack, C.hairBlonde, C.hairWhite, C.hairPink, C.hairTeal];
export const AVATAR_STATES: AnimState[] = ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate', 'dance', 'flex', 'wave', 'poke'];
export const EXPRESSIONS: Expression[] = ['smile', 'happy', 'curious', 'sparkle'];
const EYE = 0x1b1518, MOUTH = 0x3a2630, MOUTH_IN = 0xd9475a, BLUSH = 0xf3a7a1;
/** Head size in px. */
export const HEAD = {w: 18, h: 18, d: 16};
const ARM_REST = 0.22;

export type Kit = {
  tunic?: number; tunicKind?: MatKind; skirt?: 'short' | 'robe'; trim?: number; belt?: number; buckle?: number; boots?: number; gloves?: number;
  plate?: number; plateKind?: 'metal' | 'gold'; pads?: number; padsKind?: MatKind;
  helmet?: number; helmetKind?: 'metal' | 'gold'; nasal?: boolean; plume?: number; crest?: number; wings?: number; crown?: boolean; jewel?: number;
  cape?: {color: number; size: 'short' | 'long'; trim?: number}; emblem?: number;
  sword?: 'wood' | 'steel' | 'great'; shield?: {color: number; shape: 'round' | 'kite' | 'ornate'; emblem: number; kind?: MatKind}; scepter?: number; orb?: boolean;
};
/** Equipment progression. Rank never depends on gender; the base body is the same for everyone. */
export const TIER_KIT: Record<Tier | Royal, Kit> = {
  page: {tunic: C.green, skirt: 'short', belt: C.leatherDark, boots: C.leather, sword: 'wood'},
  squire: {tunic: C.quilt, tunicKind: 'quilt', belt: C.leatherDark, buckle: C.iron, pads: C.leather, padsKind: 'leather', boots: C.leatherDark, gloves: C.leather, sword: 'steel', shield: {color: C.wood, shape: 'round', emblem: C.green, kind: 'wood'}},
  iron: {tunic: C.blue, skirt: 'short', plate: C.iron, plateKind: 'metal', pads: C.ironDark, padsKind: 'metal', helmet: C.iron, helmetKind: 'metal', nasal: true, gloves: C.iron, boots: C.ironDark, belt: C.leatherDark, sword: 'steel', shield: {color: C.blue, shape: 'kite', emblem: C.ivory}},
  silver: {tunic: C.teal, skirt: 'short', plate: C.silver, plateKind: 'metal', pads: C.silver, padsKind: 'metal', helmet: C.silver, helmetKind: 'metal', plume: C.teal, gloves: C.silverDark, boots: C.silverDark, belt: C.leatherDark, sword: 'steel', shield: {color: C.teal, shape: 'kite', emblem: C.silver}},
  golden: {tunic: C.crimson, skirt: 'short', plate: C.gold, plateKind: 'gold', pads: C.gold, padsKind: 'gold', helmet: C.gold, helmetKind: 'gold', crest: C.crimson, gloves: C.goldDark, boots: C.goldDark, belt: C.leatherDark, cape: {color: C.crimson, size: 'short', trim: C.gold}, sword: 'great', shield: {color: C.crimson, shape: 'ornate', emblem: C.gold}},
  champion: {tunic: C.purple, skirt: 'short', plate: C.purpleDark, plateKind: 'metal', pads: C.gold, padsKind: 'gold', helmet: C.purpleDark, helmetKind: 'metal', wings: C.gold, gloves: C.gold, boots: C.purpleDark, belt: C.gold, cape: {color: C.purple, size: 'long', trim: C.gold}, emblem: C.gold, sword: 'great', shield: {color: C.purple, shape: 'ornate', emblem: C.gold}},
  king: {tunic: C.crimson, skirt: 'robe', trim: C.ivory, belt: C.gold, buckle: C.gold, boots: C.leatherDark, crown: true, jewel: C.crimson, scepter: C.blue, orb: true},
  queen: {tunic: C.lavender, skirt: 'robe', trim: C.ivory, belt: C.gold, buckle: C.gold, boots: C.goldDark, crown: true, jewel: C.pink, scepter: C.pink},
  royal: {tunic: C.teal, skirt: 'robe', trim: C.ivory, belt: C.gold, buckle: C.gold, boots: C.leatherDark, crown: true, jewel: C.gold, scepter: C.gold},
};
export const DEFAULT_PRESET: Record<Gender, Partial<HeroPreset>> = {masc: {}, fem: {}, neutral: {}};
export function presetFor(tier: Tier | Royal, gender: Gender, over: Partial<HeroPreset> = {}): HeroPreset {
  const base: HeroPreset = {tier, gender, skin: C.skin[0], hair: 'none', hairColor: C.hairBrown, accessory: 'none', beard: false, seed: 1, expression: 'smile'};
  return {...base, ...over, tier};
}

export const avatarMaterial = softMaterial, disposeAvatarResources = disposeSoftResources;
const M = softMaterial;

/** The face, painted in pixels on the front of the head. Groups are toggled by setExpression; eyeL/eyeR pivots also scale for blinks. */
function buildFace(face: Group): void {
  const z = HEAD.d / 2, ink = M('eye', EYE), white = M('flat', 0xffffff), mouth = M('flat', MOUTH);
  for (const s of [-1, 1]) {
    const eye = piv(s < 0 ? 'eyeL' : 'eyeR', face, s * 4.5, -1, z); decal(eye, ink, 3, 4, 0, 0, 0);
    const plain = new Group(); plain.name = s < 0 ? 'hlPlainL' : 'hlPlainR'; eye.add(plain); decal(plain, white, 1, 1, -1, 1.5, 0, 1);
    const sparkle = new Group(); sparkle.name = s < 0 ? 'hlStarL' : 'hlStarR'; sparkle.visible = false; eye.add(sparkle); decal(sparkle, white, 2, 2, -0.5, 1, 0, 1); decal(sparkle, white, 1, 1, 1, -1.5, 0, 1);
    decal(face, M('blush', BLUSH), 2, 1, s * 7, -4.5, z);
  }
  const closed = new Group(); closed.name = 'eyesClosed'; closed.visible = false; face.add(closed);
  for (const s of [-1, 1]) for (const [dx, y] of [[-1, -1.5], [0, -0.5], [1, -1.5]]) decal(closed, mouth, 1, 1, s * 4.5 + dx, y, z);
  smile(face, -4.5, z, 4);
  const o = new Group(); o.name = 'mouthO'; o.visible = false; face.add(o); decal(o, mouth, 2, 2, 0, -5, z);
  const open = new Group(); open.name = 'mouthOpen'; open.visible = false; face.add(open); decal(open, mouth, 4, 2, 0, -5, z); decal(open, M('flat', MOUTH_IN), 2, 1, 0, -5.5, z, 1);
  const marks = piv('marks', face, 10.5, 9.5, 3.5); marks.visible = false;
  for (const [x, rz] of [[0, 0.15], [1.5, 0.55]] as const) box(marks, mouth, 0.5, 2, 0.5, x, 0, 0, false).rotation.z = rz;
}
export function setExpression(rig: Rig, e: Expression): void {
  const show = (n: string, on: boolean) => { const o = rig.pivots[n]; if (o) o.visible = on; };
  const open = e !== 'happy';
  show('eyeL', open); show('eyeR', open); show('eyesClosed', !open);
  show('hlPlainL', e !== 'sparkle'); show('hlPlainR', e !== 'sparkle'); show('hlStarL', e === 'sparkle'); show('hlStarR', e === 'sparkle');
  show('mouthSmile', e === 'smile'); show('mouthO', e === 'curious'); show('mouthOpen', e === 'happy' || e === 'sparkle'); show('marks', e === 'sparkle');
  rig.group.userData.expression = e;
}

function dress(kit: Kit, slots: {torso: Object3D; hat: Object3D; cape: Object3D; handL: Object3D; handR: Object3D}): void {
  const {torso, hat, cape, handL, handR} = slots, gold = M('gold', C.gold);
  if (kit.tunic !== undefined && kit.skirt) {
    const cloth = M(kit.tunicKind ?? 'cloth', kit.tunic);
    if (kit.skirt === 'robe') { box(torso, cloth, 8, 5, 6, 0, -1.5, 0); if (kit.trim !== undefined) { box(torso, M('cloth', kit.trim), 9, 1, 7, 0, -3.5, 0); box(torso, M('cloth', kit.trim), 7, 1, 5, 0, 5.5, 0); } }
    else box(torso, cloth, 8, 2, 6, 0, 0, 0);
  }
  if (kit.belt !== undefined) { box(torso, M('leather', kit.belt), 7, 1, 5, 0, 1.5, 0); if (kit.buckle !== undefined) box(torso, M('gold', kit.buckle), 2, 1, 0.4, 0, 1.5, 2.6); }
  if (kit.plate !== undefined) box(torso, M(kit.plateKind ?? 'metal', kit.plate), 7, 4, 5, 0, 4, 0);
  if (kit.emblem !== undefined) decal(torso, M('gold', kit.emblem), 2, 2, 0, 4, 2.5);
  if (kit.pads !== undefined) for (const s of [-1, 1]) box(torso, M(kit.padsKind ?? 'metal', kit.pads), 4, 2, 4, s * 5, 5.5, 0);
  if (kit.cape) { const h = kit.cape.size === 'long' ? 10 : 7; box(cape, M('cloth', kit.cape.color), 8, h, 0.5, 0, -h / 2, 0); if (kit.cape.trim !== undefined) box(cape, M('gold', kit.cape.trim), 8, 1, 0.8, 0, -h + 0.5, 0); }
  if (kit.helmet !== undefined) {
    const hk = kit.helmetKind ?? 'metal', hm = M(hk, kit.helmet);
    box(hat, hm, 20, 4, 18, 0, 8, 0); box(hat, hm, 20, 12, 3, 0, 0, -7.5); for (const s of [-1, 1]) box(hat, hm, 2, 12, 15, s * 9, 0, 1.5); // crown, back, cheek guards
    box(hat, M(hk, shade(kit.helmet, 0.8)), 21, 1, 19, 0, 5.5, 0); // brow band
    if (kit.nasal) box(hat, hm, 2, 7, 1, 0, 2.5, 9);
    if (kit.plume !== undefined) { box(hat, M('cloth', kit.plume), 2, 5, 2, 0, 12.5, -2); box(hat, M('cloth', kit.plume), 2, 3, 2, 0, 11.5, -4); }
    if (kit.crest !== undefined) box(hat, M('cloth', kit.crest), 2, 3, 14, 0, 11.5, -1);
    if (kit.wings !== undefined) for (const s of [-1, 1]) { box(hat, M('gold', kit.wings), 1, 6, 5, s * 10.5, 8, -1); box(hat, M('gold', kit.wings), 1, 4, 3, s * 10.5, 13, -2); }
  }
  if (kit.crown) {
    box(hat, gold, 10, 2, 10, 0, 10, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(hat, gold, 2, 2, 2, sx * 4, 12, sz * 4);
    if (kit.jewel !== undefined) { const gem = M('gloss', kit.jewel); for (const s of [-1, 1]) { box(hat, gem, 2, 1, 0.4, 0, 10, s * 5.1); box(hat, gem, 0.4, 1, 2, s * 5.1, 10, 0); } }
  }
  if (kit.shield) {
    const sh = kit.shield, sm = M(sh.kind ?? 'metal', sh.color), z = 2.5;
    if (sh.shape === 'round') { box(handL, sm, 4, 6, 1, 0, 0, z); for (const s of [-1, 1]) box(handL, sm, 1, 4, 1, s * 2.5, 0, z); }
    else if (sh.shape === 'kite') { box(handL, sm, 6, 4, 1, 0, 1, z); box(handL, sm, 4, 2, 1, 0, -2, z); box(handL, sm, 2, 1, 1, 0, -3.5, z); }
    else { box(handL, sm, 6, 6, 1, 0, 0, z); box(handL, M('gold', sh.emblem), 6, 1, 1.4, 0, 3.5, z); box(handL, sm, 4, 1, 1, 0, -3.5, z); }
    decal(handL, M('gold', sh.emblem), 2, 2, 0, sh.shape === 'kite' ? 1 : 0, z + 0.5);
  }
  if (kit.sword) {
    const steel = kit.sword !== 'wood', great = kit.sword === 'great', len = great ? 10 : steel ? 8 : 7, trim = steel ? gold : M('wood', C.woodDark);
    const sword = new Group(); sword.position.z = 1.5 * PX; sword.rotation.x = 0.9; handR.add(sword); // held low, blade forward and up
    box(sword, M('leather', C.leatherDark), 1, 2, 1, 0, 0.5, 0); box(sword, trim, great ? 5 : 3, 1, 1, 0, 2, 0); box(sword, trim, 1, 1, 1, 0, -1, 0);
    box(sword, steel ? M('metal', C.silver) : M('wood', C.wood), great ? 2 : 1, len, 0.5, 0, 2.5 + len / 2, 0);
  }
  if (kit.scepter !== undefined) { const sc = new Group(); sc.position.z = 2 * PX; sc.rotation.x = 0.2; handR.add(sc); box(sc, gold, 1, 8, 1, 0, 3, 0); box(sc, M('gloss', kit.scepter), 2, 2, 2, 0, 8, 0); }
  if (kit.orb) { box(handL, M('gloss', C.blue), 3, 3, 3, 0, 0, 2.5); box(handL, gold, 1, 2, 1, 0, 2.5, 2.5); }
}

export function buildHero(presetIn: Partial<HeroPreset> = {}): Rig {
  const preset = presetFor(presetIn.tier ?? 'page', presetIn.gender ?? 'neutral', presetIn), kit = TIER_KIT[preset.tier];
  const skin = M('skin', preset.skin), cloth = kit.tunic !== undefined ? M(kit.tunicKind ?? 'cloth', kit.tunic) : skin;
  const group = new Group(); group.name = `avatar:${preset.tier}`;
  const root = piv('root', group, 0, 0, 0);
  for (const s of [-1, 1]) {
    const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 1.5, 5, 0);
    if (kit.boots !== undefined) { box(leg, M('leather', kit.boots), 3, 4, 3, 0, -3, 0); box(leg, M('leather', shade(kit.boots, 1.25)), 3, 1, 3, 0, -0.5, 0); } else box(leg, skin, 3, 5, 3, 0, -2.5, 0);
  }
  const torso = piv('torso', root, 0, 5, 0); box(torso, cloth, 6, 6, 4, 0, 3, 0);
  const hands: Record<string, Object3D> = {};
  for (const s of [-1, 1]) {
    const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 4.5, 5.5, 0); arm.rotation.z = s * ARM_REST;
    const gloved = kit.gloves !== undefined; // sleeve, bare arm, then a glove or the hand
    box(arm, cloth, 3, 2, 3, 0, -0.5, 0); box(arm, skin, 3, gloved ? 2 : 4, 3, 0, gloved ? -2.5 : -3.5, 0);
    if (gloved) box(arm, M('leather', kit.gloves!), 3, 2, 3, 0, -4.5, 0);
    hands[s < 0 ? 'handL' : 'handR'] = piv(s < 0 ? 'handL' : 'handR', arm, 0, -5, 0);
  }
  const head = piv('head', torso, 0, 6, 0); box(head, skin, HEAD.w, HEAD.h, HEAD.d, 0, HEAD.h / 2, 0);
  const face = new Group(); face.name = 'face'; face.position.y = (HEAD.h / 2) * PX; head.add(face); buildFace(face);
  const hat = piv('hat', head, 0, HEAD.h / 2, 0), cape = piv('cape', torso, 0, 5.5, -3);
  dress(kit, {torso, hat, cape, handL: hands.handL, handR: hands.handR});
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const rig = makeRig(group, 'avatar', pivots, AVATAR_HEIGHT, AVATAR_STATES, 'idle');
  rig.scratch.armRest = ARM_REST; rig.scratch.armRRest = ARM_REST;
  rig.dispose = () => { group.removeFromParent(); }; // geometry and materials are shared caches; see disposeAvatarResources()
  group.userData.preset = preset;
  setExpression(rig, preset.expression);
  return rig;
}
