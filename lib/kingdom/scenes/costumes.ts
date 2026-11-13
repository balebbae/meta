/**
 * Who lives in each world. The kingdom keeps its knights and kings; elsewhere the same heroes and kaijus are converted
 * on the spot: astronauts and aliens in space, divers and deep-sea monsters under the sea, bundled-up heroes and ice
 * kaijus on a snow day. Everything is bolted onto existing pivots, so every animation still works. Sizes are in px.
 */
import {Box3, Group, type Object3D, Vector3} from 'three';
import {HEAD} from '../factories/hero';
import {PX, box, softMaterial as M} from '../factories/soft';
import type {Rig} from '../types';
import type {WorldId} from './worlds';

const WHITE = 0xf4f8ff, RED = 0xe2483d, YELLOW = 0xffcf3f, ORANGE = 0xff8a3c, CORAL = 0xff7a59, ICE = 0xbfe6ff, PINK = 0xff5cf0, CYAN = 0x7df9ff, GLASS = 0xcfefff;
type Live = (t: number) => void;
const b = new Box3(), lo = new Vector3(), hi = new Vector3();
const part = (parent: Object3D, x: number, y: number, z: number): Group => { const g = new Group(); g.position.set(x * PX, y * PX, z * PX); parent.add(g); return g; };
/** A part's bounds in its own px: centre, width, depth and the top. Hats, horns and crowns count. */
function bounds(o: Object3D): {cx: number; cy: number; cz: number; w: number; h: number; d: number; top: number} {
  o.updateWorldMatrix(true, true); b.setFromObject(o); o.worldToLocal(lo.copy(b.min)); o.worldToLocal(hi.copy(b.max));
  const w = Math.abs(hi.x - lo.x) / PX, h = Math.abs(hi.y - lo.y) / PX, d = Math.abs(hi.z - lo.z) / PX;
  return {cx: (lo.x + hi.x) / 2 / PX, cy: (lo.y + hi.y) / 2 / PX, cz: (lo.z + hi.z) / 2 / PX, w, h, d, top: Math.max(lo.y, hi.y) / PX};
}

function hero(r: Rig, world: WorldId): Live | null {
  const head = r.pivots.head, torso = r.pivots.torso; if (!head || !torso) return null;
  const phase = r.group.id * 1.7; // so a squad does not move in step
  const e = bounds(head), side = HEAD.w / 2, face = HEAD.d / 2;
  if (world === 'space') { // astronaut: bubble helmet over whatever they wear, collar, air pack, a blinking antenna
    box(head, M('glass', GLASS), e.w + 3, e.h + 2, e.d + 3, e.cx, e.cy + 0.5, e.cz, false);
    box(head, M('gloss', WHITE), 13, 2, 11, 0, -0.5, 0); box(torso, M('gloss', WHITE), 6, 7, 3, 0, 3.5, -3.5); const lamp = box(torso, M('glow', CYAN), 2, 1, 0.5, 0, 5, -5.2, false);
    box(head, M('metal', 0xd7dee8), 1, 4, 1, 5, e.top + 3, 0); const tip = box(head, M('glow', RED), 2, 2, 2, 5, e.top + 6, 0, false);
    return (t) => { tip.scale.setScalar(1 + 0.4 * Math.max(0, Math.sin(t * 5 + phase))); lamp.visible = (t + phase) % 1.6 < 1.1; };
  } else if (world === 'reef') { // diver: mask over the eyes (they stay visible), snorkel, air tank, flippers
    box(head, M('glass', GLASS), 15, 7, 1, 0, 8, face + 0.6, false);
    for (const y of [4, 12]) box(head, M('gloss', YELLOW), 16, 1, 1.4, 0, y, face + 0.7);
    box(head, M('gloss', YELLOW), HEAD.w + 0.6, 1.5, HEAD.d + 0.6, 0, 12, 0);
    box(head, M('gloss', YELLOW), 2, 13, 2, side + 1.2, 12, 2); box(head, M('gloss', ORANGE), 2, 2, 2, side + 1.2, 19.5, 2);
    box(torso, M('gloss', YELLOW), 4, 6, 3, 0, 3, -3.5);
    for (const leg of [r.pivots.legL, r.pivots.legR]) if (leg) box(leg, M('gloss', ORANGE), 4, 1, 7, 0, -4.5, 2.5);
    const air = [0, 1, 2].map(() => box(head, M('glass', 0xffffff), 2, 2, 2, side + 1.2, 21, 2, false)); // bubbles off the snorkel
    return (t) => air.forEach((m, i) => { const k = (t * 0.55 + i / 3 + phase) % 1; m.position.set((side + 1.2 + Math.sin(k * 9 + i) * 1.2) * PX, (21 + k * 12) * PX, 2 * PX); m.scale.setScalar(0.5 + k * 0.9); m.visible = k < 0.92; });
  } else if (world === 'frost') { // snow day: earmuffs with a band over the top, a scarf with a tail
    for (const s of [-1, 1]) { box(head, M('cloth', RED), 3, 6, 6, s * (side + 1.2), 9, 0); box(head, M('cloth', 0x3a2630), 1, e.top - 9, 2, s * (side + 0.6), (e.top + 9) / 2, 0); }
    box(head, M('cloth', 0x3a2630), HEAD.w + 2.2, 1.5, 2, 0, e.top + 0.5, 0);
    box(torso, M('cloth', RED), 10, 2.5, 8, 0, 5.5, 0); box(torso, M('cloth', RED), 2.5, 5, 1.5, 2.5, 2.8, 2.7); box(torso, M('cloth', WHITE), 2.5, 1, 1.6, 2.5, 1, 2.7);
    const puff = box(head, M('glass', 0xffffff), 3, 3, 3, 0, 4, face + 2, false); // a breath in the cold
    return (t) => { const k = ((t * 0.45 + phase) % 1) * 2.4; puff.visible = k < 1; puff.position.set(0, (4 + k * 2.5) * PX, (face + 2 + k * 4) * PX); puff.scale.setScalar(0.4 + k * 1.1); };
  }
  return null;
}

function kaiju(r: Rig, world: WorldId): Live | null {
  const head = r.pivots.head ?? r.pivots.root; if (!head) return null;
  const e = bounds(head), u = Math.max(1, Math.round(e.w / 10)), hide = M('skin', 0x8ccb7a); // 'skin' takes the world's kaiju colour (worlds.ts)
  if (world === 'space') { // alien: two antennae with glowing tips, glowing pods on the sides of the head
    const feelers = [-1, 1].map((s) => {
      const p = part(head, e.cx + s * e.w * 0.28, e.top, e.cz); box(p, hide, u, 4 * u, u, 0, 2 * u, 0); box(p, M('glow', PINK), 2 * u, 2 * u, 2 * u, 0, 5 * u, 0, false);
      return p;
    }), pods = [-1, 1].map((s) => box(head, M('glow', CYAN), 0.6, 2 * u, 2 * u, e.cx + s * (e.w / 2 + 0.2), e.cy, e.cz, false));
    return (t) => { feelers.forEach((p, i) => { p.rotation.z = Math.sin(t * 2.2 + i * 1.9) * 0.28; }); pods.forEach((m) => m.scale.setScalar(1 + 0.25 * Math.sin(t * 3))); };
  } else if (world === 'reef') { // deep-sea monster: a back fin, side fins, an angler's lure hanging in front
    box(head, M('gloss', CORAL), u, 4 * u, 5 * u, e.cx, e.top + 2 * u, e.cz - e.d * 0.15); box(head, M('gloss', CORAL), u, 2 * u, 3 * u, e.cx, e.top + 5 * u, e.cz - e.d * 0.15 - u);
    for (const s of [-1, 1]) box(head, M('gloss', CORAL), 3 * u, 4 * u, u, e.cx + s * (e.w / 2 + 1.5 * u), e.cy, e.cz);
    const lure = part(head, e.cx, e.top, e.cz + e.d * 0.3); box(lure, hide, u, 5 * u, u, 0, 2.5 * u, 0); box(lure, hide, u, u, 4 * u, 0, 5 * u, 2 * u); const bulb = box(lure, M('glow', YELLOW), 2 * u, 2 * u, 2 * u, 0, 3.5 * u, 4.5 * u, false);
    return (t) => { lure.rotation.x = Math.sin(t * 1.8) * 0.2; lure.rotation.z = Math.sin(t * 1.1) * 0.12; bulb.scale.setScalar(1 + 0.3 * Math.sin(t * 4)); };
  } else if (world === 'frost') { // ice kaiju: a cap of snow and a crown of icicles
    box(head, M('cloth', WHITE), e.w + u, 1.5 * u, e.d + u, e.cx, e.top + 0.75 * u, e.cz);
    for (const [x, tall] of [[-0.32, 4], [0, 6], [0.32, 4]]) { box(head, M('gloss', ICE), 2 * u, tall * u, 2 * u, e.cx + x * e.w, e.top + (1.5 + tall / 2) * u, e.cz); box(head, M('gloss', ICE), u, 2 * u, u, e.cx + x * e.w, e.top + (2.5 + tall) * u, e.cz); }
    const glint = box(head, M('flat', 0xffffff), u, u, u, e.cx, e.top + 10 * u, e.cz, false); // a sparkle on the tallest icicle
    return (t) => { const k = Math.max(0, Math.sin(t * 2.6)); glint.scale.setScalar(k * 1.8 + 0.01); glint.rotation.z = t * 2; };
  }
  return null;
}

/** Convert a freshly built hero or kaiju to the world it is placed in, and return the motion of what was added (blinks, bubbles, breath). Mounts, props and the kingdom are left as they are. */
export function dress(r: Rig, world: WorldId): Live | null {
  if (world === 'kingdom') return null;
  return r.group.userData.creature ? kaiju(r, world) : r.species === 'hero' || r.species === 'avatar' ? hero(r, world) : null;
}
