/** Ponies in the soft-toy style. Pivots: root, head, tail, legFL/FR/BL/BR and `rider` on the saddle (catalog.ts seats a hero there). */
import {Group, Mesh, Object3D} from 'three';
import {C} from '../palette';
import {makeRig} from '../rig';
import type {MountKind, Rig} from '../types';
import {blob, boxSphere, capsule, capsuleBox, cutaway, geo, mesh, piv, pyramid, rbox, softBlush, softEyes, softMaterial, softSmile} from './soft';

export function buildMount(kind: MountKind = 'chestnut'): Rig {
  const royal = kind === 'royal', coat = royal ? C.whitePony : C.chestnut, mane = royal ? C.hairBlonde : C.mane;
  const sk = softMaterial('skin', coat), mn = softMaterial('cloth', mane), leather = softMaterial('leather', C.leather);
  const group = new Group(); group.name = `mount:${kind}`;
  const root = piv('root', group, 0, 0, 0);
  const body = mesh(geo('ponyBody', () => capsuleBox(0.27, 0.46, 8, 24).rotateX(Math.PI / 2)), sk); body.position.set(0, 0.62, 0); root.add(body);
  blob(root, sk, 0.26, 0.21, 0.3, 0, 0.55, 0.04);
  for (const [name, x, z] of [['legFL', -0.16, 0.3], ['legFR', 0.16, 0.3], ['legBL', -0.16, -0.3], ['legBR', 0.16, -0.3]] as const) {
    const leg = piv(name, root, x, 0.44, z); const lm = mesh(capsule(0.09, 0.2), sk); lm.position.y = -0.2; leg.add(lm); blob(leg, softMaterial('leather', C.hoof), 0.1, 0.06, 0.11, 0, -0.4, 0.01);
  }
  const neck = mesh(capsule(0.15, 0.22), sk); neck.position.set(0, 0.84, 0.42); neck.rotation.x = -0.55; root.add(neck);
  for (const [y, z] of [[1.02, 0.33], [0.97, 0.2], [0.9, 0.08]]) blob(root, mn, 0.1, 0.09, 0.14, 0, y, z);
  const head = piv('head', root, 0, 1.0, 0.52);
  blob(head, sk, 0.27, 0.25, 0.3, 0, 0.1, 0.06); blob(head, sk, 0.18, 0.14, 0.17, 0, 0.0, 0.33);
  for (const s of [-1, 1]) blob(head, softMaterial('skin', C.hoof), 0.02, 0.015, 0.012, s * 0.06, 0.02, 0.49, false);
  softSmile(head, -0.07, 0.49, 0.035, -0.03, 0.01);
  softEyes(head, {x: 0.22, y: 0.17, z: 0.17, w: 0.055, h: 0.08, yaw: 1.0}); softBlush(head, 0.25, 0.06, 0.16, 0.06, 0.035, 1.1);
  for (const s of [-1, 1]) { const ear = mesh(geo('ponyEar', () => pyramid(0.05, 0.14, 12).translate(0, 0.07, 0)), sk); ear.position.set(s * 0.14, 0.3, -0.02); ear.rotation.z = s * -0.3; head.add(ear); }
  blob(head, mn, 0.12, 0.08, 0.12, 0.04, 0.33, 0.1); blob(head, mn, 0.1, 0.07, 0.1, -0.06, 0.31, 0.15);
  const tail = piv('tail', root, 0, 0.74, -0.5); const tm = mesh(capsule(0.08, 0.26), mn); tm.rotation.x = 0.7; tm.position.set(0, -0.2 * Math.cos(0.7), -0.2 * Math.sin(0.7)); tail.add(tm); blob(tail, mn, 0.1, 0.09, 0.1, 0, -0.33, -0.29);
  // saddle: blanket, seat shell, pommel and cantle; the rider pivot sits on top
  const blanket = mesh(geo('blanket', () => rbox(0.58, 0.05, 0.5, 2, 0.02)), softMaterial('cloth', royal ? C.blue : C.crimson)); blanket.position.set(0, 0.84, 0); root.add(blanket);
  const seat = mesh(geo('saddleSeat', () => { const g = boxSphere(1, 28, 20); g.scale(0.26, 0.12, 0.3); return cutaway(g, (_x, y) => y > 0); }), royal ? softMaterial('gold', C.gold) : leather); seat.position.set(0, 0.86, 0); root.add(seat);
  blob(root, royal ? softMaterial('gold', C.gold) : leather, 0.05, 0.07, 0.05, 0, 0.95, 0.22); blob(root, royal ? softMaterial('gold', C.gold) : leather, 0.09, 0.06, 0.05, 0, 0.94, -0.23);
  piv('rider', root, 0, 0.96, 0);
  if (royal) {
    const cap = mesh(geo('caparison', () => cutaway(capsuleBox(0.3, 0.46, 8, 24).rotateX(Math.PI / 2), (_x, y) => y < 0.06)), softMaterial('cloth', C.blue)); cap.position.set(0, 0.62, 0); root.add(cap);
    for (const s of [-1, 1]) for (const z of [-0.3, -0.1, 0.1, 0.3]) blob(root, softMaterial('gold', C.gold), 0.03, 0.03, 0.03, s * 0.29, 0.42, z);
    const plume = mesh(capsule(0.05, 0.14), softMaterial('cloth', C.blue)); plume.position.set(0, 0.46, 0.02); plume.rotation.x = -0.3; head.add(plume);
    blob(head, softMaterial('gold', C.gold), 0.045, 0.045, 0.03, 0, 0.3, 0.22);
  }
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const rig = makeRig(group, 'pony', pivots, 1.34, ['idle', 'walk', 'trot', 'run', 'jump', 'attack', 'hit', 'celebrate']);
  rig.dispose = () => { group.removeFromParent(); };
  return rig;
}
