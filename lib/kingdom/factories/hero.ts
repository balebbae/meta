/**
 * The Kaiju base avatar: a soft toy with an oversized rounded head, tiny body and capsule limbs, gender neutral,
 * with costumes layered on named slots (hat, torso wear, cape, hands). Smooth geometry, no voxels.
 * Proportions follow the approved SVG turnaround (640×800 sheet → 1.8 m tall, ground at y = 0, face toward +z).
 */
import {BufferGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, QuadraticBezierCurve3, TorusGeometry, TubeGeometry, Vector2, Vector3} from 'three';
import {cutaway, disposeSoftResources, geo, mesh, piv, softMaterial, sphere, star, type MatKind} from './soft';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import type {AnimState, Expression, Gender, HeroPreset, Rig, Royal, Tier} from '../types';

export const AVATAR_HEIGHT = 1.8;
export const SKIN_TONES: readonly number[] = C.skin;
export const HAIR_COLORS = [C.hairBrown, C.hairAuburn, C.hairBlack, C.hairBlonde, C.hairWhite, C.hairPink, C.hairTeal];
export const AVATAR_STATES: AnimState[] = ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate', 'dance', 'flex', 'wave', 'poke'];
export const EXPRESSIONS: Expression[] = ['smile', 'happy', 'curious', 'sparkle'];
const EYE = 0x1b1518, MOUTH = 0x3a2630, MOUTH_IN = 0xd9475a, BLUSH = 0xf3a7a1;
export const HEAD = {w: 1.16, h: 1.10, d: 1.0, r: 0.42}; // rounder than the sheet's 0.31: the user asked for a softer head from every angle

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

// ---- shared toolkit (soft.ts) --------------------------------------------------------------------------------------
export const avatarMaterial = softMaterial, disposeAvatarResources = disposeSoftResources;
const torsoProfile = (scale: number, yFrom: number, yTo: number): BufferGeometry => {
  const pts = [[0, 0.22], [0.12, 0.22], [0.17, 0.26], [0.195, 0.36], [0.19, 0.5], [0.165, 0.62], [0.13, 0.70], [0.07, 0.745], [0, 0.75]].map(([r, y]) => new Vector2(r * scale, (y - 0.30) * (1 + (scale - 1) * 0.5)));
  const g = new LatheGeometry(pts, 40); g.scale(1, 1, 0.78);
  return yFrom > -1 ? cutaway(g, (_x, y) => y >= yFrom && y <= yTo) : g;
};
const smileCurve = (x0: number, x1: number, y: number, dip: number, z: number) => new TubeGeometry(new QuadraticBezierCurve3(new Vector3(x0, y, z), new Vector3((x0 + x1) / 2, y + dip, z), new Vector3(x1, y, z)), 12, 0.013, 8, false);

const EYE_X = 0.26, EYE_Y = -0.07, MOUTH_Y = -0.205;
/** Face parts on the flat front of the head. Groups are toggled by setExpression; eyeL/eyeR pivots also scale for blinks. */
function buildFace(face: Group): void {
  const z = 0.46, eyeMat = avatarMaterial('eye', EYE), white = avatarMaterial('flat', 0xffffff), ink = avatarMaterial('flat', MOUTH), inner = avatarMaterial('flat', MOUTH_IN), blush = avatarMaterial('blush', BLUSH);
  for (const s of [-1, 1]) {
    const eye = piv(s < 0 ? 'eyeL' : 'eyeR', face, s * EYE_X, EYE_Y, z);
    const e = mesh(sphere(), eyeMat, false); e.scale.set(0.082, 0.118, 0.05); eye.add(e);
    const plain = new Group(); plain.name = s < 0 ? 'hlPlainL' : 'hlPlainR'; eye.add(plain);
    const hl = mesh(sphere(), white, false); hl.scale.set(0.027, 0.036, 0.012); hl.position.set(-0.028, 0.045, 0.047); plain.add(hl);
    const hl2 = mesh(sphere(), white, false); hl2.scale.set(0.012, 0.015, 0.01); hl2.position.set(0.026, -0.05, 0.047); plain.add(hl2);
    const sparkle = new Group(); sparkle.name = s < 0 ? 'hlStarL' : 'hlStarR'; sparkle.visible = false; eye.add(sparkle);
    const big = mesh(geo('starBig', () => star(0.042, 0.013)), white, false); big.position.set(-0.012, 0.02, 0.052); sparkle.add(big);
    const small = mesh(geo('starSmall', () => star(0.02, 0.007)), white, false); small.position.set(0.034, -0.05, 0.052); sparkle.add(small);
    const b = mesh(sphere(), blush, false); b.scale.set(0.1, 0.052, 0.03); b.position.set(s * 0.33, -0.2, 0.455); face.add(b);
  }
  const closed = new Group(); closed.name = 'eyesClosed'; closed.visible = false; face.add(closed);
  for (const s of [-1, 1]) { const arc = mesh(geo('eyeArc', () => new TubeGeometry(new QuadraticBezierCurve3(new Vector3(-0.095, -0.03, 0), new Vector3(0, 0.13, 0), new Vector3(0.095, -0.03, 0)), 14, 0.019, 8, false)), ink, false); arc.position.set(s * EYE_X, EYE_Y, 0.49); closed.add(arc); for (const e of [-0.095, 0.095]) { const cap = mesh(sphere(), ink, false); cap.scale.setScalar(0.019); cap.position.set(s * EYE_X + e, EYE_Y - 0.03, 0.49); closed.add(cap); } }
  const smile = new Group(); smile.name = 'mouthSmile'; face.add(smile);
  smile.add(mesh(geo('smile', () => smileCurve(-0.065, 0.065, MOUTH_Y, -0.075, 0.49)), ink, false));
  for (const s of [-1, 1]) { const cap = mesh(sphere(), ink, false); cap.scale.setScalar(0.014); cap.position.set(s * 0.065, MOUTH_Y, 0.49); smile.add(cap); }
  const o = new Group(); o.name = 'mouthO'; o.visible = false; face.add(o);
  const om = mesh(sphere(), ink, false); om.scale.set(0.028, 0.04, 0.012); om.position.set(0, MOUTH_Y - 0.02, 0.49); o.add(om);
  const open = new Group(); open.name = 'mouthOpen'; open.visible = false; open.position.set(0, MOUTH_Y + 0.02, 0.49); face.add(open);
  open.add(mesh(geo('mouthD', () => new CircleGeometry(0.082, 30, Math.PI, Math.PI)), ink, false));
  const lip = mesh(geo('mouthLip', () => new RoundedBoxGeometry(0.164, 0.022, 0.012, 2, 0.006)), ink, false); lip.position.y = 0.004; open.add(lip);
  const red = mesh(geo('mouthIn', () => new CircleGeometry(0.066, 30, Math.PI, Math.PI)), inner, false); red.position.set(0, -0.006, 0.004); open.add(red);
  const tongue = mesh(sphere(), blush, false); tongue.scale.set(0.04, 0.024, 0.01); tongue.position.set(0, -0.052, 0.008); open.add(tongue);
  const marks = new Group(); marks.name = 'marks'; marks.visible = false; marks.position.set(0.5, 0.66, 0.22); face.add(marks);
  for (const [x, rz] of [[0, 0.15], [0.09, 0.55]] as const) { const m = mesh(geo('mark', () => new CapsuleGeometry(0.013, 0.07, 4, 10)), ink, false); m.position.set(x, 0, 0); m.rotation.z = rz; marks.add(m); }
}
export function setExpression(rig: Rig, e: Expression): void {
  const show = (n: string, on: boolean) => { const o = rig.pivots[n]; if (o) o.visible = on; };
  const open = e !== 'happy';
  show('eyeL', open); show('eyeR', open); show('eyesClosed', !open);
  show('hlPlainL', e !== 'sparkle'); show('hlPlainR', e !== 'sparkle'); show('hlStarL', e === 'sparkle'); show('hlStarR', e === 'sparkle');
  show('mouthSmile', e === 'smile'); show('mouthO', e === 'curious'); show('mouthOpen', e === 'happy' || e === 'sparkle'); show('marks', e === 'sparkle');
  rig.group.userData.expression = e;
}

function dress(kit: Kit, slots: {torso: Object3D; hat: Object3D; cape: Object3D; handL: Object3D; handR: Object3D; legs: Object3D[]; arms: Object3D[]}): void {
  const {torso, hat, cape, handL, handR} = slots;
  if (kit.tunic !== undefined) {
    torso.add(mesh(geo(`tunic:${kit.skirt ?? 'none'}`, () => torsoProfile(1.07, -0.055, 0.41)), avatarMaterial(kit.tunicKind ?? 'cloth', kit.tunic)));
    if (kit.skirt) {
      const robe = kit.skirt === 'robe', g = geo(`skirt:${kit.skirt}`, () => { const pts = robe ? [[0.2, -0.02], [0.235, -0.1], [0.265, -0.18], [0.275, -0.21], [0, -0.21]] : [[0.2, -0.02], [0.235, -0.09], [0.26, -0.14], [0, -0.14]]; const l = new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 40); l.scale(1, 1, 0.82); return l; });
      torso.add(mesh(g, avatarMaterial(kit.tunicKind ?? 'cloth', kit.tunic)));
      if (kit.trim !== undefined) { const ring = mesh(geo('hemTrim', () => { const t = new TorusGeometry(0.268, 0.02, 10, 48); t.scale(1, 1, 0.82); t.rotateX(Math.PI / 2); return t; }), avatarMaterial('cloth', kit.trim)); ring.position.y = -0.2; torso.add(ring); const collar = mesh(geo('collar', () => { const t = new TorusGeometry(0.135, 0.03, 10, 40); t.scale(1, 1, 0.8); t.rotateX(Math.PI / 2); return t; }), avatarMaterial('cloth', kit.trim)); collar.position.y = 0.39; torso.add(collar); }
    }
  }
  if (kit.belt !== undefined) { const b = mesh(geo('belt', () => { const t = new TorusGeometry(0.2, 0.026, 10, 48); t.scale(1, 1, 0.8); t.rotateX(Math.PI / 2); return t; }), avatarMaterial('leather', kit.belt)); b.position.y = 0.0; torso.add(b); if (kit.buckle !== undefined) { const k = mesh(geo('buckle', () => new RoundedBoxGeometry(0.07, 0.06, 0.03, 3, 0.012)), avatarMaterial('gold', kit.buckle)); k.position.set(0, 0.0, 0.18); torso.add(k); } }
  if (kit.plate !== undefined) torso.add(mesh(geo('plateFront', () => cutaway(torsoProfile(1.12, -1, 1), (_x, y, z) => z > -0.02 && y >= -0.03 && y <= 0.4)), avatarMaterial(kit.plateKind ?? 'metal', kit.plate)));
  if (kit.emblem !== undefined) { const e = mesh(geo('emblem', () => new CircleGeometry(0.045, 24)), avatarMaterial('gold', kit.emblem), false); e.position.set(0, 0.2, 0.235); torso.add(e); }
  if (kit.pads !== undefined) for (const s of [-1, 1]) { const pad = mesh(sphere(), avatarMaterial(kit.padsKind ?? 'metal', kit.pads)); pad.scale.set(0.115, 0.085, 0.105); pad.position.set(s * 0.215, 0.36, 0); torso.add(pad); }
  if (kit.cape) { const long = kit.cape.size === 'long', h = long ? 0.62 : 0.42, g = geo(`cape:${kit.cape.size}`, () => { const pg = new PlaneGeometry(0.52, h, 6, 8); const pos = pg.getAttribute('position'); for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, -0.06 * (x / 0.26) ** 2 + 0.04 * (y / h)); pos.setX(i, x * (1 + 0.25 * (0.5 - y / h))); } pg.computeVertexNormals(); return pg; }); const c = mesh(g, new MeshStandardMaterial({color: kit.cape.color, roughness: 0.9, side: DoubleSide})); c.position.set(0, -h / 2 + 0.02, -0.02); cape.add(c); if (kit.cape.trim !== undefined) { const clasp = mesh(sphere(), avatarMaterial('gold', kit.cape.trim)); clasp.scale.setScalar(0.035); clasp.position.set(0, 0.0, 0.0); cape.add(clasp); } }
  if (kit.helmet !== undefined) {
    const hk = kit.helmetKind ?? 'metal';
    hat.add(mesh(geo('helmet', () => cutaway(new RoundedBoxGeometry(1.24, 1.17, 1.08, 8, 0.46), (_x, y, z) => y > -0.33 && !(z > -0.02 && y < 0.24))), avatarMaterial(hk, kit.helmet)));
    const rim = mesh(geo('helmetRim', () => { const t = new TorusGeometry(0.59, 0.03, 10, 60); t.rotateX(Math.PI / 2); return t; }), avatarMaterial(hk, shade(kit.helmet, 0.8))); rim.position.y = 0.25; rim.scale.set(1.0, 1, 0.9); hat.add(rim);
    if (kit.nasal) { const n = mesh(geo('nasal', () => new RoundedBoxGeometry(0.07, 0.34, 0.05, 2, 0.02)), avatarMaterial(hk, kit.helmet)); n.position.set(0, 0.09, 0.555); hat.add(n); }
    if (kit.plume !== undefined) { const pl = mesh(geo('plume', () => new CapsuleGeometry(0.055, 0.22, 6, 14)), avatarMaterial('cloth', kit.plume)); pl.position.set(0, 0.7, -0.08); pl.rotation.x = 0.55; hat.add(pl); }
    if (kit.crest !== undefined) { const cr = mesh(geo('crest', () => new RoundedBoxGeometry(0.06, 0.16, 0.6, 3, 0.025)), avatarMaterial('cloth', kit.crest)); cr.position.set(0, 0.64, -0.05); hat.add(cr); }
    if (kit.wings !== undefined) for (const s of [-1, 1]) { const w = mesh(sphere(), avatarMaterial('gold', kit.wings)); w.scale.set(0.06, 0.2, 0.27); w.position.set(s * 0.66, 0.36, 0.0); w.rotation.z = s * -0.55; w.rotation.y = s * 0.25; hat.add(w); }
  }
  if (kit.crown) {
    const crown = new Group(); crown.position.set(0.14, 0.565, 0.04); crown.rotation.z = -0.16; crown.rotation.x = 0.05; hat.add(crown);
    crown.add(mesh(geo('crownRing', () => { const t = new TorusGeometry(0.21, 0.045, 12, 48); t.rotateX(Math.PI / 2); return t; }), avatarMaterial('gold', C.gold)));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, spike = mesh(geo('spike', () => new ConeGeometry(0.04, 0.13, 10)), avatarMaterial('gold', C.gold)); spike.position.set(Math.cos(a) * 0.21, 0.09, Math.sin(a) * 0.21); crown.add(spike); if (i % 2 === 0 && kit.jewel !== undefined) { const j = mesh(sphere(), avatarMaterial('gloss', kit.jewel)); j.scale.setScalar(0.034); j.position.set(Math.cos(a) * 0.225, 0.0, Math.sin(a) * 0.225); crown.add(j); } }
  }
  if (kit.shield) {
    const sh = kit.shield, g = geo(`shield:${sh.shape}`, () => sh.shape === 'round' ? new CylinderGeometry(0.17, 0.17, 0.035, 36).rotateX(Math.PI / 2) : new RoundedBoxGeometry(0.27, sh.shape === 'ornate' ? 0.36 : 0.34, 0.035, 4, sh.shape === 'ornate' ? 0.06 : 0.1));
    const s = mesh(g, avatarMaterial(sh.kind ?? 'metal', sh.color)); s.position.set(-0.04, -0.02, 0.06); if (sh.shape === 'kite') s.rotation.z = Math.PI; handL.add(s);
    const em = mesh(geo('shieldEmblem', () => new CircleGeometry(0.06, 24)), avatarMaterial('gold', sh.emblem), false); em.position.set(-0.04, sh.shape === 'kite' ? 0.04 : 0.0, 0.085); handL.add(em);
    if (sh.shape === 'ornate') { const r = mesh(geo('shieldRim', () => new TorusGeometry(0.125, 0.014, 8, 40)), avatarMaterial('gold', sh.emblem), false); r.position.set(-0.04, -0.02, 0.085); handL.add(r); }
  }
  if (kit.sword) {
    const steel = kit.sword !== 'wood', great = kit.sword === 'great', len = great ? 0.56 : 0.46, bm = steel ? avatarMaterial('metal', C.silver) : avatarMaterial('wood', C.wood);
    const sword = new Group(); sword.rotation.z = -2.05; handR.add(sword);
    const blade = mesh(geo(`blade:${kit.sword}`, () => new RoundedBoxGeometry(great ? 0.075 : 0.055, len, 0.018, 3, 0.008)), bm); blade.position.y = len / 2 + 0.1; sword.add(blade);
    const guard = mesh(geo('guard', () => new RoundedBoxGeometry(great ? 0.2 : 0.16, 0.035, 0.035, 2, 0.012)), steel ? avatarMaterial('gold', C.gold) : avatarMaterial('wood', C.woodDark)); guard.position.y = 0.1; sword.add(guard);
    const grip = mesh(geo('grip', () => new CylinderGeometry(0.02, 0.022, 0.12, 12)), avatarMaterial('leather', C.leatherDark)); grip.position.y = 0.03; sword.add(grip);
    const pommel = mesh(sphere(), steel ? avatarMaterial('gold', C.gold) : avatarMaterial('wood', C.woodDark)); pommel.scale.setScalar(0.03); pommel.position.y = -0.04; sword.add(pommel);
  }
  if (kit.scepter !== undefined) {
    const sc = new Group(); sc.rotation.z = -2.05; handR.add(sc);
    const rod = mesh(geo('rod', () => new CylinderGeometry(0.016, 0.02, 0.42, 12)), avatarMaterial('gold', C.gold)); rod.position.y = 0.15; sc.add(rod);
    const jewel = mesh(sphere(), avatarMaterial('gloss', kit.scepter)); jewel.scale.setScalar(0.05); jewel.position.y = 0.39; sc.add(jewel);
    const ring = mesh(geo('scepterRing', () => new TorusGeometry(0.05, 0.012, 8, 24)), avatarMaterial('gold', C.gold)); ring.position.y = 0.39; sc.add(ring);
  }
  if (kit.orb) { const orb = mesh(sphere(), avatarMaterial('gloss', C.blue)); orb.scale.setScalar(0.065); orb.position.set(0, -0.04, 0.06); handL.add(orb); const cross = mesh(geo('orbCross', () => new RoundedBoxGeometry(0.02, 0.07, 0.02, 2, 0.006)), avatarMaterial('gold', C.gold)); cross.position.set(0, 0.04, 0.06); handL.add(cross); }
}

export function buildHero(presetIn: Partial<HeroPreset> = {}): Rig {
  const preset = presetFor(presetIn.tier ?? 'page', presetIn.gender ?? 'neutral', presetIn), kit = TIER_KIT[preset.tier], skin = preset.skin;
  const skinMat = avatarMaterial('skin', skin);
  const group = new Group(); group.name = `avatar:${preset.tier}`;
  const root = piv('root', group, 0, 0, 0);
  const legs: Object3D[] = [];
  for (const s of [-1, 1]) {
    const leg = piv(s < 0 ? 'legL' : 'legR', root, s * 0.10, 0.30, 0); legs.push(leg);
    const lm = mesh(geo('leg', () => new CapsuleGeometry(0.09, 0.13, 6, 18)), kit.boots !== undefined ? avatarMaterial('leather', kit.boots) : skinMat); lm.position.y = -0.155; leg.add(lm);
    if (kit.boots !== undefined) { const cuff = mesh(geo('cuff', () => { const t = new TorusGeometry(0.092, 0.018, 8, 28); t.rotateX(Math.PI / 2); return t; }), avatarMaterial('leather', shade(kit.boots, 1.25))); cuff.position.y = -0.08; leg.add(cuff); }
  }
  const torso = piv('torso', root, 0, 0.30, 0);
  torso.add(mesh(geo('torso', () => torsoProfile(1, -1, 1)), skinMat));
  const arms: Object3D[] = [], hands: Record<string, Object3D> = {};
  for (const s of [-1, 1]) {
    const arm = piv(s < 0 ? 'armL' : 'armR', torso, s * 0.20, 0.35, 0); arm.rotation.z = s * 0.4; arms.push(arm);
    const am = mesh(geo('arm', () => new CapsuleGeometry(0.075, 0.23, 6, 18)), skinMat); am.position.y = -0.19; arm.add(am);
    const hand = piv(s < 0 ? 'handL' : 'handR', arm, 0, -0.36, 0); hands[s < 0 ? 'handL' : 'handR'] = hand;
    if (kit.gloves !== undefined) { const gl = mesh(sphere(), avatarMaterial('leather', kit.gloves)); gl.scale.setScalar(0.085); gl.position.y = 0.02; hand.add(gl); }
  }
  const head = piv('head', torso, 0, 0.40, 0);
  const hm = mesh(geo('head', () => new RoundedBoxGeometry(HEAD.w, HEAD.h, HEAD.d, 8, HEAD.r)), skinMat); hm.position.y = 0.55; head.add(hm);
  const face = new Group(); face.name = 'face'; face.position.y = 0.55; head.add(face); buildFace(face);
  const hat = piv('hat', head, 0, 0.55, 0), cape = piv('cape', torso, 0, 0.36, -0.14);
  dress(kit, {torso, hat, cape, handL: hands.handL, handR: hands.handR, legs, arms});
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const rig = makeRig(group, 'avatar', pivots, AVATAR_HEIGHT, AVATAR_STATES, 'idle');
  rig.scratch.armRest = 0.4; rig.scratch.armRRest = kit.sword || kit.scepter !== undefined ? 1.75 : 0.4;
  rig.dispose = () => { group.removeFromParent(); }; // geometry and materials are shared caches; see disposeAvatarResources()
  group.userData.preset = preset;
  setExpression(rig, preset.expression);
  return rig;
}
