/**
 * Creatures: slime, goblin, cyclops, stone giant, baby dragon, elder dragon. Each returns a Rig with the pivots its
 * animator moves (root, head, armL/armR, legL/legR, wingL/wingR, tail, flame). Variants change size and anatomy.
 */
import {Group, Object3D} from 'three';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import type {CreatureKind, Rig, Variant} from '../types';
import {VOXEL, Vox, meshPart} from '../voxel';

export {DIFFICULTY, type Difficulty} from '../difficulty';
import {DIFFICULTY} from '../difficulty';
const SCALE: Record<Variant, number> = {small: 0.78, medium: 1, boss: 1.3};

const piv = (name: string, parent: Object3D, x: number, y: number, z: number) => { const o = new Object3D(); o.name = name; o.position.set(x * VOXEL, y * VOXEL, z * VOXEL); parent.add(o); return o; };
function finish(group: Group, species: Rig['species'], heightVox: number, states: Rig['states'], variant: Variant, kind: CreatureKind): Rig {
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group) pivots[o.name] = o; });
  group.scale.setScalar(SCALE[variant]); group.position.y = VOXEL / 2 * SCALE[variant];
  const rig = makeRig(group, species, pivots, heightVox * VOXEL * SCALE[variant], states);
  group.userData.creature = {kind, variant, difficulty: DIFFICULTY[kind][variant]};
  return rig;
}
function eyes(v: Vox, ex: number, ey: number, w = 2, h = 2, blushGap = 1, mouthDrop = 2, mouthW = 1, single = false): void {
  const xs = single ? [0] : [-1, 1];
  for (const s of xs) for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) v.decal(s * ex + (s <= 0 ? -i : i) + (single ? i : 0), ey + j, C.ink, 'ink');
  for (const s of xs) v.decal(s * ex, ey + h - 1, C.white, 'ink');
  for (const s of [-1, 1]) v.decal(s * (ex + w + blushGap), ey - 1, C.blush, 'skin');
  const my = ey - mouthDrop; v.decal(0, my, C.mouth, 'ink'); if (mouthW) { v.decal(-1, my + 1, C.mouth, 'ink'); v.decal(1, my + 1, C.mouth, 'ink'); }
}

export function buildCreature(kind: CreatureKind, variant: Variant = 'medium'): Rig {
  const group = new Group(); group.name = `creature:${kind}:${variant}`;
  const root = piv('root', group, 0, 0, 0);
  const boss = variant === 'boss';
  if (kind === 'slime') {
    const v = new Vox();
    v.ellipsoid(0, 5, 0, 7.5, 5.2, 7, C.slime, 'slime', (x, y) => y >= 1); v.ellipsoid(0, 4, 0, 8, 3.8, 7.5, C.slime, 'slime', (x, y) => y >= 1 && y <= 4);
    v.ellipsoid(-3, 8, -2, 2.2, 1.6, 2.2, shade(C.slime, 1.15), 'slime');
    v.box(0, 10, 0, 0, 11, 0, C.greenDark, 'leaf'); v.box(-1, 12, 0, 1, 12, 0, C.white, 'cloth'); v.box(0, 12, -1, 0, 12, 1, C.white, 'cloth'); v.box(0, 12, 0, 0, 12, 0, C.gold, 'gold'); v.box(1, 11, 0, 2, 11, 0, C.greenDark, 'leaf');
    if (boss) { v.cylY(0, 0, 3.4, 10, 10, C.gold, 'gold'); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; v.box(Math.round(Math.sin(a) * 3.2), 11, Math.round(Math.cos(a) * 3.2), Math.round(Math.sin(a) * 3.2), 11 + (i % 2), Math.round(Math.cos(a) * 3.2), C.gold, 'gold'); } v.ellipsoid(4, 7, 3, 2.2, 1.6, 2.2, shade(C.slime, 1.12), 'slime'); v.ellipsoid(-2, 3, 6, 1.8, 1.4, 1.8, shade(C.slime, 1.1), 'slime'); }
    eyes(v, 2, 5, 2, 3, 1, 2);
    root.add(meshPart(v, [0, 0, 0], 'body'));
    return finish(group, 'slime', 13, ['idle', 'walk', 'run', 'jump', 'squash', 'attack', 'hit', 'celebrate'], variant, kind);
  }
  if (kind === 'goblin') {
    const sk = C.goblin, body = new Vox();
    body.ellipsoid(0, 7, 0, 4.2, 4, 3.6, sk, 'skin', (x, y) => y >= 4);
    body.box(-4, 5, -3, 4, 9, 3, C.leatherDark, 'leather', ); body.box(-2, 5, 3, 2, 9, 4, sk, 'skin'); body.del(-2, 9, 4); body.del(2, 9, 4);
    body.box(-4, 4, -3, 4, 4, 3, C.leather, 'leather'); body.box(0, 4, 4, 0, 4, 4, C.gold, 'gold');
    body.box(-3, 1, -1, -2, 3, 1, sk, 'skin'); body.box(2, 1, -1, 3, 3, 1, sk, 'skin'); body.box(-3, 0, -2, -1, 0, 2, C.leatherDark, 'leather'); body.box(1, 0, -2, 3, 0, 2, C.leatherDark, 'leather');
    root.add(meshPart(body, [0, 0, 0], 'body'));
    const head = piv('head', root, 0, 11, 0), hv = new Vox();
    hv.ellipsoid(0, 5, 0, 5.4, 4.6, 4.8, sk, 'skin');
    for (const s of [-1, 1]) { for (let i = 0; i < 6; i++) hv.box(s * (5 + i), 5 + Math.floor(i / 2), -1, s * (5 + i), 7 + Math.floor(i / 2), 1, sk, 'skin'); hv.box(s * 6, 6, 0, s * 8, 7, 0, C.blush, 'skin'); }
    hv.ellipsoid(0, 3, 5, 1.6, 1.3, 1.3, shade(sk, 0.9), 'skin');
    if (boss) { hv.shell(0, 5.3, -0.2, 6.4, 5.6, 5.6, 1.3, C.ironDark, 'metal', (x, y, z) => y >= 5 && !(z > 2 && y <= 8 && Math.abs(x) <= 3)); hv.box(0, 11, 0, 0, 13, 0, C.ironDark, 'metal'); }
    eyes(hv, 2, 4, 2, 2, 1, 3); hv.decal(1, 1, C.white, 'ink'); hv.decal(-2, 7, C.ink, 'ink'); hv.decal(-3, 7, C.ink, 'ink'); hv.decal(2, 7, C.ink, 'ink'); hv.decal(3, 7, C.ink, 'ink');
    head.add(meshPart(hv, [0, 0, 0], 'head'));
    const arm = (s: -1 | 1) => { const a = piv(s < 0 ? 'armL' : 'armR', root, s * 5, 10, 0), v = new Vox(); v.box(-1, -5, -1, 1, 0, 1, sk, 'skin'); if (boss) v.box(-2, -1, -1, 2, 0, 1, C.leatherDark, 'leather'); a.add(meshPart(v, [0, 0, 0], 'arm')); return a; };
    arm(-1); const armR = arm(1); armR.rotation.z = 2.0; (root.getObjectByName('armL') as Object3D).rotation.z = -0.5;
    const club = new Vox(); club.box(0, -8, 0, 0, -2, 0, C.wood, 'wood'); club.ellipsoid(0, -10, 0, 2.4, 2.8, 2.4, C.woodDark, 'wood'); if (boss) for (const [x, y, z] of [[-3, -10, 0], [3, -10, 0], [0, -13, 0], [0, -10, 3], [0, -10, -3]]) club.box(x, y, z, x, y, z, C.silver, 'metal');
    const cm = meshPart(club, [0, 0, 0], 'club'); cm.position.y = -5 * VOXEL; armR.add(cm);
    return finish(group, 'goblin', 16, ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate'], variant, kind);
  }
  if (kind === 'cyclops') {
    const sk = C.cyclops, dk = C.cyclopsDark, body = new Vox();
    body.ellipsoid(0, 7, 0, 5.8, 5.2, 4.8, sk, 'skin', (x, y) => y >= 3); body.box(-5, 3, -4, 5, 4, 4, C.leatherDark, 'leather'); body.box(-3, 4, 4, 3, 4, 5, C.gold, 'gold');
    body.box(-4, 0, -2, -2, 2, 2, sk, 'skin'); body.box(2, 0, -2, 4, 2, 2, sk, 'skin'); body.box(-5, 0, -3, -1, 0, 3, dk, 'skin'); body.box(1, 0, -3, 5, 0, 3, dk, 'skin');
    if (boss) { body.box(-6, 8, -1, -5, 9, 1, C.iron, 'metal'); body.box(5, 8, -1, 6, 9, 1, C.iron, 'metal'); }
    root.add(meshPart(body, [0, 0, 0], 'body'));
    const head = piv('head', root, 0, 12, 0), hv = new Vox();
    hv.ellipsoid(0, 5, 0, 6.2, 5.4, 5.4, sk, 'skin');
    for (const s of [-1, 1]) { const hh = boss ? 5 : 3; for (let i = 0; i < hh; i++) hv.box(s * (3 + Math.floor(i / 2)), 10 + i, -1, s * (3 + Math.floor(i / 2)), 10 + i, 0, C.cream, 'cloth'); hv.box(s * 7, 4, -1, s * 7, 5, 0, sk, 'skin'); }
    for (let x = -2; x <= 2; x++) for (let y = 3; y <= 7; y++) hv.decal(x, y, Math.abs(x) <= 1 && y >= 4 && y <= 6 ? C.ink : C.white, 'ink'); hv.decal(-1, 6, C.white, 'ink');
    hv.decal(-4, 3, C.blush, 'skin'); hv.decal(4, 3, C.blush, 'skin'); hv.decal(-1, 1, C.mouth, 'ink'); hv.decal(0, 1, C.mouth, 'ink'); hv.decal(1, 1, C.mouth, 'ink'); hv.decal(-2, 2, C.mouth, 'ink'); hv.decal(2, 2, C.mouth, 'ink');
    head.add(meshPart(hv, [0, 0, 0], 'head'));
    const arm = (s: -1 | 1) => { const a = piv(s < 0 ? 'armL' : 'armR', root, s * 6.5, 10, 0), v = new Vox(); v.box(-1, -7, -1, 1, 0, 1, sk, 'skin'); v.box(-2, -9, -2, 2, -8, 2, sk, 'skin'); a.add(meshPart(v, [0, 0, 0], 'arm')); return a; };
    arm(-1); const armR = arm(1); armR.rotation.z = 1.6; (root.getObjectByName('armL') as Object3D).rotation.z = -0.4;
    const club = new Vox(); club.box(0, -9, 0, 0, -2, 0, C.wood, 'wood'); club.box(-1, -14, -1, 1, -10, 1, C.woodDark, 'wood'); if (boss) for (const [x, y, z] of [[-2, -12, 0], [2, -12, 0], [0, -12, 2], [0, -12, -2], [0, -15, 0]]) club.box(x, y, z, x, y, z, C.silver, 'metal');
    const cm = meshPart(club, [0, 0, 0], 'club'); cm.position.y = -8 * VOXEL; armR.add(cm);
    return finish(group, 'cyclops', 18, ['idle', 'walk', 'run', 'jump', 'attack', 'hit', 'celebrate'], variant, kind);
  }
  if (kind === 'giant') {
    // A walking boulder stack: stout stone legs, a round torso, a head boulder with the face, moss and a flower on top.
    const rk = C.giant, dk = C.giantDark, body = new Vox();
    for (const s of [-1, 1]) { body.box(s * 5 - 1, 2, -2, s * 5 + 1, 8, 2, dk, 'stone'); body.box(s * 5 - 2, 0, -3, s * 5 + 2, 1, 3, dk, 'stone'); }
    body.ellipsoid(0, 14, 0, 8, 7.5, 5.5, rk, 'stone'); body.box(-6, 8, -3, 6, 19, 3, rk, 'stone');
    body.ellipsoid(0, 24, 0, 5.5, 4.8, 4.6, rk, 'stone'); body.box(-4, 21, -3, 4, 27, 3, rk, 'stone');
    const mossAt: [number, number, number][] = [[-3, 28, 0], [2, 28, -2], [-6, 19, 1], [5, 18, -3], [0, 19, 3], [-2, 20, 4]];
    if (boss) { body.ellipsoid(-10, 19, 0, 3.4, 3, 3.4, rk, 'stone'); body.ellipsoid(10, 19, 0, 3.4, 3, 3.4, rk, 'stone'); mossAt.push([-10, 22, 0], [10, 22, 1], [4, 27, 2]); }
    for (const [x, y, z] of mossAt) { body.box(x, y, z, x + 1, y, z + 1, C.moss, 'moss'); body.box(x, y, z + 1, x, y, z + 1, C.leafLight, 'moss'); }
    body.box(0, 29, 0, 0, 29, 0, C.greenDark, 'leaf'); body.box(-1, 30, 0, 1, 30, 0, C.pink, 'cloth'); body.box(0, 30, -1, 0, 30, 1, C.pink, 'cloth'); body.box(0, 30, 0, 0, 30, 0, C.gold, 'gold');
    if (boss) { body.box(5, 29, 2, 5, 29, 2, C.greenDark, 'leaf'); body.box(4, 30, 2, 6, 30, 2, C.white, 'cloth'); body.box(5, 30, 1, 5, 30, 3, C.white, 'cloth'); body.box(5, 30, 2, 5, 30, 2, C.gold, 'gold'); }
    for (const [x, y, z] of [[2, 12, 5], [-4, 10, 5], [-5, 16, -5], [7, 13, 0], [3, 23, 4], [-4, 26, -4]]) body.paint(x, y, z, shade(rk, 0.75));
    for (const s of [-1, 1]) { body.decal(s * 2, 24, C.ink, 'ink'); body.decal(s * 3, 24, C.ink, 'ink'); body.decal(s * 2, 25, C.ink, 'ink'); body.decal(s * 3, 25, C.ink, 'ink'); body.decal(s * 3, 25, C.white, 'ink'); body.decal(s * 5, 23, C.blush, 'stone'); }
    body.decal(-1, 22, C.ink, 'ink'); body.decal(0, 22, C.ink, 'ink'); body.decal(1, 22, C.ink, 'ink'); body.decal(-2, 23, C.ink, 'ink'); body.decal(2, 23, C.ink, 'ink');
    body.jitter(7, 0.06, ['stone']);
    root.add(meshPart(body, [0, 0, 0], 'body'));
    const arm = (s: -1 | 1) => { const a = piv(s < 0 ? 'armL' : 'armR', root, s * (boss ? 11 : 9), 18, 0), v = new Vox(); v.box(-1, -8, -1, 1, 0, 1, rk, 'stone'); v.box(-2, -11, -2, 2, -9, 2, dk, 'stone'); v.jitter(9 + s, 0.06); a.add(meshPart(v, [0, 0, 0], 'arm')); return a; };
    arm(-1); arm(1); (root.getObjectByName('armL') as Object3D).rotation.z = -0.2; (root.getObjectByName('armR') as Object3D).rotation.z = 0.2;
    const legR = piv('legR', root, 5, 8, 0); // the stomp animator lifts this pivot; the leg cubes stay in the body for silhouette, the pivot carries a foot overlay
    const foot = new Vox(); foot.box(-2, -8, -3, 2, -7, 3, dk, 'stone'); legR.add(meshPart(foot, [0, 0, 0], 'foot'));
    return finish(group, 'giant', 31, ['idle', 'walk', 'jump', 'attack', 'stomp', 'hit', 'celebrate'], variant, kind);
  }

  // dragons
  const elder = kind === 'elderDragon', sk = elder ? C.dragonElder : C.dragonBaby, dk = elder ? C.dragonElderDark : C.dragonBabyDark, belly = elder ? C.bellyGold : C.belly, horn = C.cream;
  const sc = elder ? 1.15 : 0.9;
  const body = new Vox();
  body.ellipsoid(0, 7, 0, 5.4 * sc, 4.6 * sc, 6.5 * sc, sk, 'scale', (x, y) => y >= 3); body.ellipsoid(0, 6, 4 * sc, 3.4 * sc, 3.4 * sc, 3.6 * sc, belly, 'skin', (x, y, z) => z >= 4 * sc && y >= 3 && y <= 8);
  for (let i = 0; i < (elder ? 6 : 4); i++) body.box(0, 11 + Math.round(sc) - i, -1 - i * 1.5, 0, 12 + Math.round(sc) - i, -1 - i * 1.5, dk, 'scale');
  root.add(meshPart(body, [0, 0, 0], 'body'));
  const leg = (s: -1 | 1) => { const l = piv(s < 0 ? 'legL' : 'legR', root, s * 3, 3, 0), v = new Vox(); v.box(-1, -2, -2, 1, 0, 1, sk, 'scale'); v.box(-2, -3, -2, 2, -3, 2, dk, 'scale'); l.add(meshPart(v, [0, 0, 0], 'leg')); };
  leg(-1); leg(1);
  const tail = piv('tail', root, 0, 6, -6 * sc), tv = new Vox();
  for (let i = 0; i < (elder ? 10 : 8); i++) { const r = Math.max(1, 2.6 - i * 0.28); tv.ellipsoid(0, Math.floor(i * 0.4), -i * 1.4, r, r, 1.2, sk, 'scale'); if (i % 2) tv.box(0, Math.floor(i * 0.4) + Math.round(r), -i * 1.4, 0, Math.floor(i * 0.4) + Math.round(r), -i * 1.4, dk, 'scale'); }
  tail.add(meshPart(tv, [0, 0, 0], 'tail'));
  const head = piv('head', root, 0, 11, 3 * sc), hv = new Vox();
  hv.ellipsoid(0, 4, 0, 4.8 * sc, 3.8 * sc, 4.2 * sc, sk, 'scale'); hv.ellipsoid(0, 2.5, 4, 3.2, 2.2, 2.6, sk, 'scale'); hv.box(-1, 2, 6, 1, 2, 6, shade(sk, 0.85), 'scale'); hv.box(-1, 1, 6, 1, 1, 6, C.mouth, 'ink'); hv.box(-2, 2, 6, -2, 2, 6, C.ink, 'ink'); hv.box(2, 2, 6, 2, 2, 6, C.ink, 'ink');
  for (const s of [-1, 1]) { if (elder) { hv.box(s * 2, 7, -2, s * 2, 9, -2, horn, 'cloth'); hv.box(s * 3, 9, -3, s * 3, 10, -3, horn, 'cloth'); if (boss) hv.box(s * 3, 11, -4, s * 3, 11, -4, horn, 'cloth'); } else { hv.ellipsoid(s * 2.5, 8, -1.5, 1.4, 1.4, 1.4, horn, 'cloth'); } hv.box(s * 5, 4, -1, s * 5, 5, 0, sk, 'scale'); }
  eyes(hv, 2, 4, 2, 2, 1, 99, 0);
  head.add(meshPart(hv, [0, 0, 0], 'head'));
  const flame = piv('flame', head, 0, 1, 7); const fv = new Vox(); fv.box(0, 0, 0, 0, 0, 3, C.flame, 'glow'); fv.box(-1, 0, 1, 1, 0, 2, C.flameCore, 'glow'); fv.box(0, 1, 1, 0, 1, 2, C.flameCore, 'glow'); fv.box(0, -1, 2, 0, -1, 3, C.flame, 'glow'); flame.add(meshPart(fv, [0, 0, 0], 'flame')); flame.scale.setScalar(0.01);
  const wing = (s: -1 | 1) => { const w = piv(s < 0 ? 'wingL' : 'wingR', root, s * 3, 10, -2), v = new Vox(); const span = elder ? (boss ? 14 : 11) : 7; for (let i = 0; i < span; i++) { const h = Math.min(elder ? 9 : 6, 2 + i); v.box(s * i, 0, 0, s * i, h, 0, i % 3 === 0 ? dk : sk, 'scale'); v.box(s * i, h + 1, 0, s * i, h + 1, 0, dk, 'scale'); } for (let i = span; i < span + 3; i++) v.box(s * i, Math.max(1, (elder ? 7 : 4) - (i - span)), 0, s * i, (elder ? 9 : 6) - (i - span), 0, dk, 'scale'); w.add(meshPart(v, [0, 0, 0], 'wing')); return w; };
  wing(-1); wing(1);
  return finish(group, 'dragon', elder ? 19 : 16, ['idle', 'walk', 'run', 'jump', 'flap', 'puff', 'attack', 'hit', 'celebrate'], variant, kind);
}
