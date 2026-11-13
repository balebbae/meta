/** Ponies in the pixel style. Pivots: root, head, tail, legFL/FR/BL/BR and `rider` on the saddle (catalog.ts seats a hero there). Sizes in px (soft.ts). */
import {Group, Mesh, Object3D} from 'three';
import {C} from '../palette';
import {makeRig} from '../rig';
import type {MountKind, Rig} from '../types';
import {PX, blush, box, decal, eyes, piv, smile, softMaterial} from './soft';

const M = softMaterial;
export function buildMount(kind: MountKind = 'chestnut'): Rig {
  const royal = kind === 'royal', sk = M('skin', royal ? C.whitePony : C.chestnut), mn = M('cloth', royal ? C.hairBlonde : C.mane), tack = royal ? M('gold', C.gold) : M('leather', C.leather);
  const group = new Group(); group.name = `mount:${kind}`;
  const root = piv('root', group, 0, 0, 0);
  box(root, sk, 9, 8, 16, 0, 10, 0);
  for (const [name, x, z] of [['legFL', -3, 5.5], ['legFR', 3, 5.5], ['legBL', -3, -5.5], ['legBR', 3, -5.5]] as const) { const leg = piv(name, root, x, 6, z); box(leg, sk, 3, 4, 3, 0, -2, 0); box(leg, M('leather', C.hoof), 3, 2, 3, 0, -5, 0); }
  box(root, sk, 5, 6, 4, 0, 16.5, 6); box(root, mn, 2, 7, 2, 0, 17.5, 3); // neck and the mane down its back
  const head = piv('head', root, 0, 18, 8);
  box(head, sk, 8, 8, 8, 0, 2, 0); box(head, sk, 6, 4, 3, 0, 0, 5.5);
  for (const s of [-1, 1]) { decal(head, M('flat', C.hoof), 1, 1, s * 1.5, 1, 7); box(head, sk, 2, 3, 1, s * 3, 7.5, -1); }
  eyes(head, {x: 2.5, y: 3.5, z: 4}); blush(head, 3.5, 1.5, 4, 1); smile(head, -0.5, 7);
  box(head, mn, 4, 2, 5, 0, 7, 1.5); box(head, mn, 2, 6, 2, 0, 4, -5);
  const tail = piv('tail', root, 0, 13, -8); box(tail, mn, 3, 9, 3, 0, -3.5, -2).rotation.x = 0.5;
  // saddle: blanket, seat, pommel and cantle; the rider pivot sits on top
  box(root, M('cloth', royal ? C.blue : C.crimson), 10, 1, 8, 0, 14.5, -2); box(root, tack, 7, 1, 6, 0, 15.5, -2); box(root, tack, 3, 2, 1, 0, 16, 1.5); box(root, tack, 5, 2, 1, 0, 16, -5.5);
  piv('rider', root, 0, 16, -3); // set back so the rider's big head clears the pony's
  if (royal) {
    box(root, M('cloth', C.blue), 10, 6, 17, 0, 9, 0); box(root, tack, 11, 1, 18, 0, 6.5, 0); // caparison and its gold hem
    box(head, M('cloth', C.blue), 2, 4, 2, 0, 10, -1); decal(head, tack, 2, 2, 0, 5, 4);
  }
  const pivots: Record<string, Object3D> = {}; group.traverse((o) => { if (o.name && o !== group && !(o as Mesh).isMesh) pivots[o.name] = o; });
  const rig = makeRig(group, 'pony', pivots, 26 * PX, ['idle', 'walk', 'trot', 'run', 'jump', 'attack', 'hit', 'celebrate']);
  rig.dispose = () => { group.removeFromParent(); };
  return rig;
}
