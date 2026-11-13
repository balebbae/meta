/**
 * Who lives in each world. The kingdom keeps its knights and kings; elsewhere the same heroes and kaijus are converted
 * on the spot: astronauts and aliens in space, divers and deep-sea monsters under the sea, bundled-up heroes and ice
 * kaijus on a snow day. Everything is bolted onto existing pivots, so every animation still works. Sizes are in px.
 */
import {Box3, type Object3D, Vector3} from 'three';
import {HEAD} from '../factories/hero';
import {PX, box, softMaterial as M} from '../factories/soft';
import type {Rig} from '../types';
import type {WorldId} from './worlds';

const WHITE = 0xf4f8ff, RED = 0xe2483d, YELLOW = 0xffcf3f, ORANGE = 0xff8a3c, CORAL = 0xff7a59, ICE = 0xbfe6ff, PINK = 0xff5cf0, CYAN = 0x7df9ff, GLASS = 0xcfefff;
const b = new Box3(), lo = new Vector3(), hi = new Vector3();
/** A part's bounds in its own px: centre, width, depth and the top. Hats, horns and crowns count. */
function bounds(o: Object3D): {cx: number; cy: number; cz: number; w: number; h: number; d: number; top: number} {
  o.updateWorldMatrix(true, true); b.setFromObject(o); o.worldToLocal(lo.copy(b.min)); o.worldToLocal(hi.copy(b.max));
  const w = Math.abs(hi.x - lo.x) / PX, h = Math.abs(hi.y - lo.y) / PX, d = Math.abs(hi.z - lo.z) / PX;
  return {cx: (lo.x + hi.x) / 2 / PX, cy: (lo.y + hi.y) / 2 / PX, cz: (lo.z + hi.z) / 2 / PX, w, h, d, top: Math.max(lo.y, hi.y) / PX};
}

function hero(r: Rig, world: WorldId): void {
  const head = r.pivots.head, torso = r.pivots.torso; if (!head || !torso) return;
  const e = bounds(head), side = HEAD.w / 2, face = HEAD.d / 2;
  if (world === 'space') { // astronaut: bubble helmet over whatever they wear, collar, air pack, a blinking antenna
    box(head, M('glass', GLASS), e.w + 3, e.h + 2, e.d + 3, e.cx, e.cy + 0.5, e.cz, false);
    box(head, M('gloss', WHITE), 13, 2, 11, 0, -0.5, 0); box(torso, M('gloss', WHITE), 6, 7, 3, 0, 3.5, -3.5); box(torso, M('glow', CYAN), 2, 1, 0.5, 0, 5, -5.2, false);
    box(head, M('metal', 0xd7dee8), 1, 4, 1, 5, e.top + 3, 0); box(head, M('glow', RED), 2, 2, 2, 5, e.top + 6, 0, false);
  } else if (world === 'reef') { // diver: mask over the eyes (they stay visible), snorkel, air tank, flippers
    box(head, M('glass', GLASS), 15, 7, 1, 0, 8, face + 0.6, false);
    for (const y of [4, 12]) box(head, M('gloss', YELLOW), 16, 1, 1.4, 0, y, face + 0.7);
    box(head, M('gloss', YELLOW), HEAD.w + 0.6, 1.5, HEAD.d + 0.6, 0, 12, 0);
    box(head, M('gloss', YELLOW), 2, 13, 2, side + 1.2, 12, 2); box(head, M('gloss', ORANGE), 2, 2, 2, side + 1.2, 19.5, 2);
    box(torso, M('gloss', YELLOW), 4, 6, 3, 0, 3, -3.5);
    for (const leg of [r.pivots.legL, r.pivots.legR]) if (leg) box(leg, M('gloss', ORANGE), 4, 1, 7, 0, -4.5, 2.5);
  } else if (world === 'frost') { // snow day: earmuffs with a band over the top, a scarf with a tail
    for (const s of [-1, 1]) { box(head, M('cloth', RED), 3, 6, 6, s * (side + 1.2), 9, 0); box(head, M('cloth', 0x3a2630), 1, e.top - 9, 2, s * (side + 0.6), (e.top + 9) / 2, 0); }
    box(head, M('cloth', 0x3a2630), HEAD.w + 2.2, 1.5, 2, 0, e.top + 0.5, 0);
    box(torso, M('cloth', RED), 10, 2.5, 8, 0, 5.5, 0); box(torso, M('cloth', RED), 2.5, 5, 1.5, 2.5, 2.8, 2.7); box(torso, M('cloth', WHITE), 2.5, 1, 1.6, 2.5, 1, 2.7);
  }
}

function kaiju(r: Rig, world: WorldId): void {
  const head = r.pivots.head ?? r.pivots.root; if (!head) return;
  const e = bounds(head), u = Math.max(1, Math.round(e.w / 10)), hide = M('skin', 0x8ccb7a); // 'skin' takes the world's kaiju colour (worlds.ts)
  if (world === 'space') { // alien: two antennae with glowing tips, glowing pods on the sides of the head
    for (const s of [-1, 1]) {
      box(head, hide, u, 4 * u, u, e.cx + s * e.w * 0.28, e.top + 2 * u, e.cz); box(head, M('glow', PINK), 2 * u, 2 * u, 2 * u, e.cx + s * e.w * 0.28, e.top + 5 * u, e.cz, false);
      box(head, M('glow', CYAN), 0.6, 2 * u, 2 * u, e.cx + s * (e.w / 2 + 0.2), e.cy, e.cz, false);
    }
  } else if (world === 'reef') { // deep-sea monster: a back fin, side fins, an angler's lure hanging in front
    box(head, M('gloss', CORAL), u, 4 * u, 5 * u, e.cx, e.top + 2 * u, e.cz - e.d * 0.15); box(head, M('gloss', CORAL), u, 2 * u, 3 * u, e.cx, e.top + 5 * u, e.cz - e.d * 0.15 - u);
    for (const s of [-1, 1]) box(head, M('gloss', CORAL), 3 * u, 4 * u, u, e.cx + s * (e.w / 2 + 1.5 * u), e.cy, e.cz);
    const z = e.cz + e.d * 0.3; box(head, hide, u, 5 * u, u, e.cx, e.top + 2.5 * u, z); box(head, hide, u, u, 4 * u, e.cx, e.top + 5 * u, z + 2 * u); box(head, M('glow', YELLOW), 2 * u, 2 * u, 2 * u, e.cx, e.top + 3.5 * u, z + 4.5 * u, false);
  } else if (world === 'frost') { // ice kaiju: a cap of snow and a crown of icicles
    box(head, M('cloth', WHITE), e.w + u, 1.5 * u, e.d + u, e.cx, e.top + 0.75 * u, e.cz);
    for (const [x, tall] of [[-0.32, 4], [0, 6], [0.32, 4]]) { box(head, M('gloss', ICE), 2 * u, tall * u, 2 * u, e.cx + x * e.w, e.top + (1.5 + tall / 2) * u, e.cz); box(head, M('gloss', ICE), u, 2 * u, u, e.cx + x * e.w, e.top + (2.5 + tall) * u, e.cz); }
  }
}

/** Convert a freshly built hero or kaiju to the world it is placed in. Mounts, props and the kingdom are left as they are. */
export function dress(r: Rig, world: WorldId): void {
  if (world === 'kingdom') return;
  if (r.group.userData.creature) kaiju(r, world); else if (r.species === 'hero' || r.species === 'avatar') hero(r, world);
}
