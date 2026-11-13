/** Royal Quest: a tile maze with chests, patrolling slimes and a timed delivery to the gate. Tiles are 1 m. */
import {type GameEvent, type Input, NO_INPUT, type Phase, edges, makeRandom} from './common.ts';

export const MAP: readonly string[] = [
  '############',
  '#S..:..T..C#',
  '#.#.:.~~~..#',
  '#.#.:..~.T.#',
  '#C..:....R.#',
  '#.TT:.#....#',
  '#...:.#.~~.#',
  '#.R.::::..C#',
  '#....T..:..#',
  '#####GG#####',
];
export const QUEST = {timeLimit: 90, hearts: 3, stepEvery: 0.2, patrolEvery: 0.55, items: ['crown', 'scepter', 'orb']} as const;
export const MAP_W = MAP[0].length, MAP_H = MAP.length;
export const tileAt = (x: number, y: number): string => (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W ? '#' : MAP[y][x]);
export const walkable = (x: number, y: number): boolean => !'#T~R'.includes(tileAt(x, y));

export type Chest = {x: number; y: number; item: string; open: boolean};
export type Patrol = {x: number; y: number; route: [number, number][]; idx: number; dir: 1 | -1; stepT: number; fromX: number; fromY: number};
export type QuestState = {
  phase: Phase; t: number; timeLeft: number; hearts: number; invuln: number;
  hero: {x: number; y: number; fromX: number; fromY: number; moveT: number; facing: 'n' | 's' | 'e' | 'w'};
  chests: Chest[]; patrols: Patrol[]; items: string[]; score: number; message: string; events: GameEvent[]; prev: Input; random: () => number;
};
const PATROLS: [number, number][][] = [
  [[5, 4], [6, 4], [7, 4], [8, 4]],
  [[1, 5], [1, 6], [1, 7], [1, 8]],
  [[7, 8], [8, 8], [9, 8], [10, 8], [10, 7]],
];
function findStart(): [number, number] { for (let y = 0; y < MAP_H; y++) { const x = MAP[y].indexOf('S'); if (x >= 0) return [x, y]; } return [1, 1]; }
export function createQuest(seed = 1): QuestState {
  const [sx, sy] = findStart(), chests: Chest[] = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === 'C') chests.push({x, y, item: QUEST.items[chests.length % 3], open: false});
  return {phase: 'intro', t: 0, timeLeft: QUEST.timeLimit, hearts: QUEST.hearts, invuln: 0, hero: {x: sx, y: sy, fromX: sx, fromY: sy, moveT: 0, facing: 's'}, chests,
    patrols: PATROLS.map((route) => ({x: route[0][0], y: route[0][1], route, idx: 0, dir: 1, stepT: QUEST.patrolEvery, fromX: route[0][0], fromY: route[0][1]})),
    items: [], score: 0, message: '', events: [], prev: {...NO_INPUT}, random: makeRandom(seed)};
}
export function startQuest(s: QuestState): QuestState { const f = createQuest(); Object.assign(s, f, {phase: 'playing', message: 'Find the crown, the scepter and the orb.', random: s.random}); return s; }

export function stepQuest(s: QuestState, input: Input, dt: number): QuestState {
  s.events = [];
  if (s.phase !== 'playing') return s;
  edges(s.prev, input); s.prev = {...input};
  s.t += dt; s.timeLeft -= dt; s.invuln = Math.max(0, s.invuln - dt);
  if (s.timeLeft <= 0) { s.timeLeft = 0; s.phase = 'lost'; s.message = 'The bells toll. Out of time.'; s.events.push({type: 'lose'}); return s; }
  const h = s.hero; h.moveT = Math.max(0, h.moveT - dt);
  if (h.moveT <= 0) {
    const dx = input.left ? -1 : input.right ? 1 : 0, dy = dx === 0 ? (input.up ? -1 : input.down ? 1 : 0) : 0;
    if (dx || dy) {
      h.facing = dx < 0 ? 'w' : dx > 0 ? 'e' : dy < 0 ? 'n' : 's';
      if (walkable(h.x + dx, h.y + dy)) { h.fromX = h.x; h.fromY = h.y; h.x += dx; h.y += dy; h.moveT = QUEST.stepEvery; }
    }
  }
  for (const c of s.chests) if (!c.open && c.x === h.x && c.y === h.y) { c.open = true; s.items.push(c.item); s.score += 100; s.message = s.items.length < 3 ? `The ${c.item}! ${3 - s.items.length} to go.` : 'All three treasures. To the gate!'; s.events.push({type: 'open', x: c.x, z: c.y}, {type: 'sparkle', x: c.x, y: 0.8, z: c.y}); }
  for (const p of s.patrols) {
    p.stepT -= dt;
    if (p.stepT <= 0) {
      p.stepT = QUEST.patrolEvery; p.fromX = p.x; p.fromY = p.y;
      let next = p.idx + p.dir; if (next < 0 || next >= p.route.length) { p.dir = -p.dir as 1 | -1; next = p.idx + p.dir; }
      p.idx = next; [p.x, p.y] = p.route[next];
    }
    if (p.x === h.x && p.y === h.y && s.invuln <= 0) {
      s.hearts -= 1; s.invuln = 1.5; s.events.push({type: 'hit', x: h.x, z: h.y, value: s.hearts});
      if (s.hearts <= 0) { s.phase = 'lost'; s.message = 'The slimes win this round.'; s.events.push({type: 'lose'}); return s; }
      s.message = `Slimed! ${s.hearts} ${s.hearts === 1 ? 'heart' : 'hearts'} left.`;
    }
  }
  if (tileAt(h.x, h.y) === 'G') {
    if (s.items.length >= 3) { s.phase = 'won'; s.score += Math.round(s.timeLeft) * 2 + s.hearts * 50; s.message = 'The treasures are home. Long live the crown!'; s.events.push({type: 'win'}); }
    else if (s.message !== 'The gate is shut until all three treasures are found.') { s.message = 'The gate is shut until all three treasures are found.'; s.events.push({type: 'message', text: s.message}); }
  }
  return s;
}
