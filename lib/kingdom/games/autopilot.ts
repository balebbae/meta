/**
 * Attract mode: the input a competent player would give, read from the game state alone. Scenes expose it as `auto()` so a
 * demo can play itself (the character sheet, an idle arcade screen) and so tests can drive a whole run. Pure, no three.
 */
import {type Input, NO_INPUT} from './common.ts';
import {DASH, type DashState} from './dash.ts';
import {DEFENSE, type DefenseState} from './defense.ts';
import {JOUST, type JoustState} from './joust.ts';
import {MAP_H, MAP_W, type QuestState, tileAt, walkable} from './quest.ts';

/** Presses are rising edges, so a held button is released every other frame. */
const tap = (was: boolean): boolean => !was;

export function autoDash(s: DashState): Input {
  const next = s.pillars.find((p) => p.x + DASH.pillarW / 2 + DASH.radius + 0.05 > s.dist), target = next ? next.gapY : 3;
  const low = s.y < target - 0.9 || (s.y < target - 0.5 && s.vy < 0);
  return {...NO_INPUT, jump: low && tap(s.prev.jump)};
}
export function autoDefense(s: DefenseState): Input {
  const en = s.enemies.filter((e) => e.state !== 'dead').sort((a, b) => a.z - b.z)[0], i = {...NO_INPUT};
  if (!en) return i;
  if (en.lane < s.lane) i.left = tap(s.prev.left); else if (en.lane > s.lane) i.right = tap(s.prev.right);
  else if (en.z <= DEFENSE.playerZ + DEFENSE.reach && s.attackCd <= 0) i.action = tap(s.prev.action);
  return i;
}
export function autoJoust(s: JoustState): Input {
  const i = {...NO_INPUT};
  if (s.openingShown && s.playerLane < s.foeOpening) i.up = tap(s.prev.up); else if (s.openingShown && s.playerLane > s.foeOpening) i.down = tap(s.prev.down);
  else if (s.braceT < 0 && s.passT >= JOUST.impactT - 0.03) i.action = tap(s.prev.action);
  return i;
}
/** Breadth-first walk to the nearest closed chest, then the gate, never stepping where a slime stands or is heading. */
export function autoQuest(s: QuestState): Input {
  const h = s.hero, i = {...NO_INPUT}; if (h.moveT > 0) return i;
  const goals = s.chests.filter((c) => !c.open).map((c) => `${c.x},${c.y}`), slimes = new Set(s.patrols.flatMap((p) => [`${p.x},${p.y}`, `${p.route[Math.max(0, Math.min(p.route.length - 1, p.idx + p.dir))].join(',')}`]));
  const done = (x: number, y: number): boolean => (goals.length ? goals.includes(`${x},${y}`) : tileAt(x, y) === 'G');
  const first = new Map<string, keyof Input>([[`${h.x},${h.y}`, 'action']]), queue: [number, number][] = [[h.x, h.y]];
  for (let n = 0; n < queue.length; n++) {
    const [x, y] = queue[n], via = first.get(`${x},${y}`)!;
    if (n > 0 && done(x, y)) { i[via] = true; return i; }
    for (const [dx, dy, key] of [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']] as const) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || first.has(k) || !walkable(nx, ny) || (slimes.has(k) && Math.abs(nx - h.x) + Math.abs(ny - h.y) <= 2)) continue;
      first.set(k, n === 0 ? key : via); queue.push([nx, ny]);
    }
  }
  return i; // boxed in by slimes: wait a beat
}
