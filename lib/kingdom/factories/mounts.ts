/** Mounts: chunky ponies with layered manes, tails and saddles. The `rider` pivot sits on the saddle; parent a hero there. */
import {Group, Object3D} from 'three';
import {C, shade} from '../palette';
import {makeRig} from '../rig';
import type {MountKind, Rig} from '../types';
import {VOXEL, Vox, meshPart} from '../voxel';

const piv = (name: string, parent: Object3D, x: number, y: number, z: number) => { const o = new Object3D(); o.name = name; o.position.set(x * VOXEL, y * VOXEL, z * VOXEL); parent.add(o); return o; };

export function buildMount(kind: MountKind = 'chestnut'): Rig {
  const royal = kind === 'royal', coat = royal ? C.whitePony : C.chestnut, mane = royal ? C.hairBlonde : C.mane, hoof = C.hoof;
  const group = new Group(); group.name = `mount:${kind}`; group.position.y = VOXEL / 2;
  const root = piv('root', group, 0, 0, 0);
  const body = new Vox();
  body.ellipsoid(0, 8, 0, 3.6, 3.4, 6.6, coat, 'skin');
  if (royal) { body.ellipsoid(0, 7, 0, 4.2, 3.4, 7, C.blue, 'cloth', (x, y, z) => y <= 8 && y >= 4 && Math.abs(z) <= 6); body.box(-4, 4, -6, 4, 4, 6, C.gold, 'gold'); for (const s of [-1, 1]) { body.box(s * 4, 6, 2, s * 4, 7, 2, C.gold, 'gold'); body.box(s * 4, 5, 1, s * 4, 5, 3, C.gold, 'gold'); } }
  // saddle: blanket, seat, pommel
  body.box(-4, 10, -3, 4, 10, 3, royal ? C.gold : C.leather, royal ? 'gold' : 'leather'); body.box(-2, 11, -2, 2, 11, 2, royal ? C.blue : C.leatherDark, 'leather'); body.box(-1, 12, -2, 1, 12, 2, royal ? C.blueDark : C.leatherDark, 'leather'); body.box(0, 13, 2, 0, 13, 2, royal ? C.gold : C.leather, royal ? 'gold' : 'leather');
  for (const s of [-1, 1]) body.box(s * 4, 7, 0, s * 4, 9, 0, royal ? C.gold : C.leatherDark, 'leather');
  body.jitter(royal ? 11 : 12, 0.03, ['skin']);
  root.add(meshPart(body, [0, 0, 0], 'body'));
  const leg = (name: string, x: number, z: number) => { const p = piv(name, root, x, 5, z), v = new Vox(); v.box(-1, -4, -1, 1, 0, 1, coat, 'skin'); v.box(-1, -5, -1, 1, -5, 1, hoof, 'leather'); if (royal) v.box(-1, -1, -1, 1, 0, 1, C.blue, 'cloth'); p.add(meshPart(v, [0, 0, 0], 'leg')); };
  leg('legFL', -2, 4); leg('legFR', 2, 4); leg('legBL', -2, -4); leg('legBR', 2, -4);
  const head = piv('head', root, 0, 10, 5), hv = new Vox();
  hv.box(-1, -1, 0, 1, 3, 2, coat, 'skin'); hv.ellipsoid(0, 4.5, 3, 2.6, 2.3, 3.4, coat, 'skin'); hv.box(-1, 3.5, 6, 1, 4.5, 7, shade(coat, 1.05), 'skin');
  hv.box(-1, 3, 7, 1, 3, 7, C.ink, 'ink'); hv.paint(-1, 3, 7, C.ink); hv.decal(-1, 3, C.mouth, 'ink'); hv.box(-2, 6, 3, -2, 7, 3, coat, 'skin'); hv.box(2, 6, 3, 2, 7, 3, coat, 'skin');
  for (const s of [-1, 1]) { hv.box(s * 3, 5, 3, s * 3, 6, 3, C.ink, 'ink'); hv.paint(s * 3, 6, 3, C.white); hv.box(s * 3, 4, 4, s * 3, 4, 4, C.blush, 'skin'); hv.paint(s * 1, 4, 7, C.ink, 'ink'); }
  for (let i = 0; i < 6; i++) hv.box(0, 3 + Math.floor(i * 0.6), -1 + i, 0, 7 - Math.floor(i * 0.4), -1 + i, mane, 'cloth'); hv.box(-1, 7, 2, 1, 7, 4, mane, 'cloth'); hv.box(0, 7, 1, 0, 8, 2, mane, 'cloth');
  if (royal) { hv.box(-1, 8, 3, 1, 8, 3, C.gold, 'gold'); hv.box(0, 9, 3, 0, 11, 3, C.blue, 'cloth'); hv.box(0, 2, 2, 0, 2, 2, C.gold, 'gold'); }
  else hv.box(-1, 2, 4, 1, 2, 4, C.leatherDark, 'leather');
  head.add(meshPart(hv, [0, 0, 0], 'head'));
  const tail = piv('tail', root, 0, 8, -7), tv = new Vox(); tv.box(0, -1, 0, 0, 1, 0, mane, 'cloth'); tv.box(0, -5, -1, 0, -2, -1, mane, 'cloth'); tv.box(-1, -4, -1, 1, -3, -1, mane, 'cloth'); tail.add(meshPart(tv, [0, 0, 0], 'tail'));
  piv('rider', root, 0, 13, 0);
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group) pivots[o.name] = o; });
  return makeRig(group, 'pony', pivots, 18 * VOXEL, ['idle', 'walk', 'trot', 'run', 'jump', 'attack', 'hit', 'celebrate']);
}
