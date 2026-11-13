/**
 * What stands and moves in the background of each world, so a world is a place and not a recolour: a rocket, a UFO and
 * hopping aliens in space; kelp, coral, fish and a crab under the sea; a snowman, penguins and an igloo on a snow day.
 * Purely for show: nothing here touches a rule or a score. Sizes are in px; every piece keeps its own colours (noTone).
 */
import {Group, type Object3D} from 'three';
import {box, softMaterial as M} from '../factories/soft';
import type {Stage} from './stage';

type Live = (t: number) => void;
const INK = 0x1b1518, WHITE = 0xf4f8ff, RED = 0xe2483d, ORANGE = 0xff8a3c, YELLOW = 0xffcf3f, CYAN = 0x7df9ff, PINK = 0xff5cf0, GREEN = 0x6fe08a;
const part = (parent: Object3D, x = 0, y = 0, z = 0): Group => { const g = new Group(); g.position.set(x / 16, y / 16, z / 16); parent.add(g); return g; };
/** Two dot eyes on a +z face. */
const dots = (g: Object3D, x: number, y: number, z: number): void => { for (const s of [-1, 1]) { box(g, M('flat', 0xffffff), 2, 2, 0.4, s * x, y, z, false); box(g, M('flat', INK), 1, 1, 0.5, s * x, y - 0.3, z + 0.1, false); } };

function rocket(live: Live[]): Group {
  const g = new Group(), body = M('gloss', WHITE), red = M('gloss', RED);
  box(g, M('metal', 0x6c7a8f), 6, 3, 6, 0, 3.5, 0); box(g, body, 10, 18, 10, 0, 14, 0); box(g, red, 8, 4, 8, 0, 25, 0); box(g, red, 6, 3, 6, 0, 28.5, 0); box(g, red, 3, 3, 3, 0, 31.5, 0);
  for (const [x, z] of [[6.5, 0], [-6.5, 0], [0, 6.5], [0, -6.5]]) { box(g, red, x ? 3 : 2, 9, z ? 3 : 2, x, 4.5, z); }
  box(g, M('metal', 0xaab4c4), 6, 6, 1, 0, 16, 5.1); const win = box(g, M('glow', CYAN), 4, 4, 1, 0, 16, 5.4, false), beacon = box(g, M('glow', RED), 2, 2, 2, 0, 34, 0, false);
  live.push((t) => { beacon.visible = t % 1.2 < 0.6; win.scale.setScalar(1 + 0.08 * Math.sin(t * 2)); });
  return g;
}
function ufo(live: Live[]): Group {
  const g = new Group(), hull = M('gloss', 0xb9c2d0);
  box(g, hull, 20, 3, 20, 0, 0, 0); box(g, M('gloss', 0x8f9ab0), 14, 2, 14, 0, -2.5, 0); box(g, M('glass', 0xcfefff), 9, 6, 9, 0, 4.5, 0, false);
  const pilot = part(g, 0, 2.5, 0); box(pilot, M('skin', GREEN), 5, 4, 5, 0, 2, 0); dots(pilot, 1.3, 2.4, 2.6);
  const lamps = [[-8, 0], [8, 0], [0, 8], [0, -8], [-6, 6], [6, 6]].map(([x, z]) => box(g, M('glow', YELLOW), 2, 1.5, 2, x, -1, z, false));
  live.push((t) => { g.position.x = Math.sin(t * 0.22) * 11; g.position.y = 6.6 + Math.sin(t * 1.4) * 0.35; g.rotation.z = Math.sin(t * 0.9) * 0.09; lamps.forEach((l, i) => { l.visible = Math.floor(t * 4 + i) % 3 !== 0; }); });
  return g;
}
function alien(live: Live[], phase: number): Group {
  const g = new Group(), skin = M('skin', GREEN);
  box(g, skin, 6, 5, 6, 0, 3.5, 0); for (const s of [-1, 1]) box(g, skin, 2, 1, 3, s * 2, 0.5, 0.5); dots(g, 1.5, 4.2, 3.1); box(g, M('flat', INK), 2, 1, 0.4, 0, 2.2, 3.1, false);
  const feelers = [-1, 1].map((s) => { const p = part(g, s * 1.5, 6, 0); box(p, skin, 1, 3, 1, 0, 1.5, 0); box(p, M('glow', PINK), 2, 2, 2, 0, 4, 0, false); return p; });
  live.push((t) => { const hop = Math.abs(Math.sin(t * 3 + phase)); g.position.y = hop * 0.28; g.scale.y = g.scale.x * (0.9 + hop * 0.14); feelers.forEach((p, i) => { p.rotation.z = Math.sin(t * 5 + phase + i * 2) * 0.35; }); });
  return g;
}
function crystals(live: Live[], color: number): Group {
  const g = new Group(), m = M('glow', color);
  box(g, m, 3, 10, 3, 0, 5, 0, false); box(g, m, 2, 6, 2, 3, 3, 1, false); box(g, m, 2, 4, 2, -3, 2, -1, false); box(g, M('flat', 0xffffff), 1, 2, 1, 0, 11, 0, false);
  live.push((t) => { g.scale.y = g.scale.x * (1 + 0.06 * Math.sin(t * 2 + color)); });
  return g;
}
function crater(): Group { const g = new Group(); box(g, M('rock', 0xa99bd6), 16, 1, 16, 0, 0.3, 0); box(g, M('rock', 0x6d5fa3), 11, 1, 11, 0, 0.5, 0); return g; }

function kelp(live: Live[], height: number, phase: number): Group {
  const g = new Group(), segs: Group[] = []; let at: Object3D = g;
  for (let i = 0; i < height; i++) { const s = part(at, 0, i ? 5 : 0, 0); box(s, M('leaf', i % 2 ? 0x3cbf7d : 0x2fa36b), 2, 5, 2, 0, 2.5, 0); if (i % 2) box(s, M('leaf', 0x58d394), 3, 2, 1, 1.5, 3, 0); segs.push(s); at = s; }
  live.push((t) => segs.forEach((s, i) => { s.rotation.z = Math.sin(t * 1.3 + i * 0.6 + phase) * 0.11; }));
  return g;
}
function coral(color: number): Group {
  const g = new Group(), m = M('gloss', color);
  box(g, m, 3, 6, 3, 0, 3, 0); box(g, m, 2, 6, 2, 0, 9, 0); for (const s of [-1, 1]) { box(g, m, 4, 2, 2, s * 3, 5, 0); box(g, m, 2, 5, 2, s * 4, 8, 0); box(g, M('flat', 0xffffff), 1, 1, 1, s * 4, 11, 0, false); }
  return g;
}
function fish(live: Live[], color: number, lane: number): Group {
  const g = new Group(), m = M('gloss', color), speed = 0.9 + lane * 0.17, y = 2.4 + lane * 0.75;
  box(g, m, 5, 3, 2, 0, 0, 0); box(g, M('flat', 0xffffff), 1, 3, 2.2, 0.5, 0, 0, false); for (const s of [-1, 1]) box(g, M('flat', INK), 1, 1, 0.3, 1.5, 0.5, s * 1.05, false);
  const tail = part(g, -2.5, 0, 0); box(tail, m, 2, 3, 1, -1, 0, 0);
  live.push((t) => { g.position.x = ((t * speed + lane * 7) % 34) - 17; g.position.y = y + Math.sin(t * 2 + lane) * 0.18; tail.rotation.y = Math.sin(t * 11 + lane) * 0.55; });
  return g;
}
function crab(live: Live[]): Group {
  const g = new Group(), m = M('gloss', RED);
  box(g, m, 8, 3, 5, 0, 3.5, 0); for (const s of [-1, 1]) { box(g, m, 1, 2, 1, s * 2, 6, 1.5); box(g, M('flat', 0xffffff), 2, 2, 2, s * 2, 7.5, 1.5, false); box(g, M('flat', INK), 1, 1, 0.4, s * 2, 7.5, 2.6, false); for (const z of [-1.5, 0, 1.5]) box(g, m, 2, 2, 1, s * 4.5, 1.5, z); }
  const claws = [-1, 1].map((s) => { const p = part(g, s * 4.5, 4.5, 2); box(p, m, 3, 2, 2, s * 1.5, 0.5, 0); box(p, m, 2, 1, 2, s * 2.5, 2, 0); return p; }), x0 = g.position.x;
  live.push((t) => { g.position.x = x0 + Math.sin(t * 0.8) * 1.9; g.position.y = Math.abs(Math.sin(t * 9)) * 0.03; claws.forEach((p, i) => { p.rotation.z = (i ? -1 : 1) * (0.25 + Math.max(0, Math.sin(t * 5 + i * 1.7)) * 0.5); }); });
  return g;
}
function starfish(color: number): Group { const g = new Group(), m = M('gloss', color); box(g, m, 7, 1, 2, 0, 0.6, 0); box(g, m, 2, 1, 7, 0, 0.6, 0); box(g, m, 3, 1.4, 3, 0, 0.7, 0); return g; }

function snowman(live: Live[]): Group {
  const g = new Group(), snow = M('cloth', WHITE), coal = M('flat', INK);
  box(g, snow, 12, 10, 12, 0, 5, 0); box(g, snow, 9, 8, 9, 0, 14, 0); box(g, snow, 7, 7, 7, 0, 21.5, 0);
  for (const s of [-1, 1]) box(g, coal, 1, 1, 0.5, s * 1.5, 22.8, 3.6, false); box(g, M('gloss', ORANGE), 1, 1, 3, 0, 21.5, 4.6); for (const y of [12.5, 15.5]) box(g, coal, 1, 1, 0.5, 0, y, 4.6, false);
  for (let i = -2; i <= 2; i++) box(g, coal, 0.8, 0.8, 0.5, i, 19.6 + Math.abs(i) * 0.4, 3.6, false); // a coal smile
  box(g, M('cloth', RED), 10, 2, 10, 0, 18, 0); box(g, M('cloth', RED), 2, 5, 1, 3, 15, 5); box(g, coal, 9, 1, 9, 0, 25.5, 0); box(g, coal, 6, 5, 6, 0, 28.5, 0); box(g, M('cloth', RED), 6.4, 1, 6.4, 0, 26.7, 0);
  const arms = [-1, 1].map((s) => { const p = part(g, s * 4.5, 15, 0); box(p, M('wood', 0x6e4526), 7, 1, 1, s * 3.5, 0, 0); box(p, M('wood', 0x6e4526), 1, 2, 1, s * 6, 1.2, 0); return p; });
  live.push((t) => { arms[1].rotation.z = 0.55 + Math.sin(t * 4) * 0.35; arms[0].rotation.z = -0.25; });
  return g;
}
function penguin(live: Live[], phase: number): Group {
  const g = new Group(), dark = M('gloss', 0x2a3344), x0 = phase * 2.2;
  box(g, dark, 6, 9, 5, 0, 5.5, 0); box(g, M('cloth', WHITE), 4, 6, 1, 0, 4.6, 2.6); dots(g, 1.4, 8.2, 2.6); box(g, M('gloss', ORANGE), 2, 1, 2, 0, 7, 3.2); for (const s of [-1, 1]) box(g, M('gloss', ORANGE), 2, 1, 3, s * 1.5, 0.5, 1);
  const wings = [-1, 1].map((s) => { const p = part(g, s * 3.2, 8, 0); box(p, dark, 1, 5, 3, s * 0.5, -2.5, 0); return p; });
  live.push((t) => { const walk = Math.sin(t * 0.5 + phase); g.position.x = x0 + walk * 2.4; g.rotation.y = Math.cos(t * 0.5 + phase) > 0 ? Math.PI / 2 : -Math.PI / 2; g.rotation.z = Math.sin(t * 7 + phase) * 0.16; g.position.y = Math.abs(Math.sin(t * 7 + phase)) * 0.05; wings.forEach((p, i) => { p.rotation.z = (i ? 1 : -1) * (0.15 + Math.abs(Math.sin(t * 7 + phase)) * 0.5); }); });
  return g;
}
function igloo(): Group {
  const g = new Group(), ice = M('cloth', 0xeaf4ff), line = M('cloth', 0xc9def2);
  box(g, ice, 22, 6, 22, 0, 3, 0); box(g, line, 22.4, 1, 22.4, 0, 6, 0); box(g, ice, 18, 5, 18, 0, 8.5, 0); box(g, line, 18.4, 1, 18.4, 0, 11, 0); box(g, ice, 12, 4, 12, 0, 13, 0);
  box(g, ice, 9, 8, 5, 0, 4, 12); box(g, M('flat', INK), 5, 6, 0.6, 0, 3, 14.6, false);
  return g;
}

/** Put this world's scenery on a stage with a backdrop. `row` is the z of the row behind the action. */
export function scenery(st: Stage, row: number, live: Live[]): void {
  const side = Math.sign(row) || -1, w = st.world.id;
  const put = (g: Group, x: number, z: number, scale = 1.4, ry = 0): Group => { g.userData.noTone = true; g.position.x += x; g.position.z = z; g.scale.multiplyScalar(scale); g.rotation.y += ry; st.group.add(g); return g; };
  if (w === 'space') {
    put(rocket(live), -6.3, row - side * 0.6, 1.5); put(ufo(live), 0, row + side * 3.5, 1.3);
    put(alien(live, 0), -2.6, row + side * 0.4, 1.3, 0.3); put(alien(live, 1.7), -0.9, row - side * 0.3, 1.1, -0.2); put(alien(live, 3.1), 8.4, row, 1.2);
    put(crystals(live, CYAN), -9.4, row + side, 1.6); put(crystals(live, PINK), 1.2, row + side * 1.5, 1.5); put(crystals(live, CYAN), 11.5, row + side * 1.2, 1.7);
    for (const [x, dz] of [[-4.4, 1.6], [3.4, 0.6], [7.2, 2.2]]) put(crater(), x, row + side * dz, 1.5);
  } else if (w === 'reef') {
    [[-9.6, 6, 0], [-8.7, 4, 1], [-3.2, 5, 2], [1.4, 7, 3], [2.2, 4, 4], [9.5, 6, 5], [12.6, 5, 6]].forEach(([x, h, p]) => put(kelp(live, h, p), x, row + side * (p % 2), 1.5));
    put(coral(0xff7fa8), -6.4, row, 1.6); put(coral(0xff9a4d), -1.2, row + side * 0.8, 1.3); put(coral(0xb084f5), 6.9, row + side * 0.5, 1.6); put(coral(0xff7fa8), 10.8, row - side * 0.4, 1.2);
    [0xff8a3c, 0xffcf3f, 0xff8a3c, 0x7df9ff, 0xffcf3f, 0xff7fa8].forEach((c, i) => put(fish(live, c, i), 0, row + side * (0.5 + (i % 3)), 1.5));
    put(crab(live), -4.2, row - side * 1.4, 1.3); put(starfish(0xff9a4d), -7.9, row - side * 1.8, 1.3, 0.5); put(starfish(0xff7fa8), 0.6, row - side * 1.2, 1.1, 1.1);
  } else if (w === 'frost') {
    put(snowman(live), -5.4, row, 1.5, 0.25); put(igloo(), -10, row + side * 1.2, 1.6, 0.4); put(igloo(), 9.6, row + side * 1.6, 1.3, -0.3);
    put(penguin(live, 0), -2.3, row - side * 0.6, 1.4); put(penguin(live, 2.1), 0.2, row + side * 0.5, 1.15); put(penguin(live, 4), 6.8, row, 1.3);
  }
}
