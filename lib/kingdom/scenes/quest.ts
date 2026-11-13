/** Royal Quest: the hedge maze drawn at two metres a cell, so the patrolling slimes can be as big as the hero. The camera follows from above. */
import {Vector3} from 'three';
import {C} from '../palette';
import {autoQuest} from '../games/autopilot';
import {MAP, MAP_H, MAP_W, QUEST, createQuest, startQuest, stepQuest} from '../games/quest';
import {setContinuous, setState} from '../rig';
import {buildTerrain} from '../factories/terrain';
import type {Rig} from '../types';
import {SKY, Stage, type GameScene, type Host} from './stage';

const K = 2; // metres per maze cell
const FACING: Record<'n' | 's' | 'e' | 'w', number> = {s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2};
const toWorld = (x: number, y: number): [number, number] => [(x - MAP_W / 2 + 0.5) * K, (y - MAP_H / 2 + 0.5) * K];
const wide = (row: string): string[] => { const d = [...row].map((c) => c.repeat(K)).join(''); return Array.from({length: K}, () => d); };

export function createQuestScene(host: Host): GameScene {
  const st = new Stage(host, {fov: 42, sun: [-6, 14, 7], radius: 17});
  let s = createQuest(1);
  st.ground(48, 44);
  const maze = buildTerrain(MAP.flatMap(wide), {'#': 'hedge', '.': 'grass', S: 'grass', C: 'grass', T: 'grass', R: 'grass', ':': 'path', G: 'path', '~': 'water'}, 3); st.group.add(maze.group);
  const tree = st.make('world-tree-round'), rock = st.make('world-rock'), chest = st.make('world-chest'), chests = new Map<string, Rig>();
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const ch = MAP[y][x], [wx, wz] = toWorld(x, y);
    if (ch === 'T') st.clone(tree, wx, 0, wz, (x * 7 + y) % 6).group.scale.setScalar(1.5);
    if (ch === 'R') st.clone(rock, wx, 0, wz, x).group.scale.setScalar(1.7);
    if (ch === 'C') { const c = st.clone(chest, wx, 0, wz); c.group.scale.setScalar(1.5); chests.set(`${x},${y}`, c); }
  }
  const [cx, cz] = toWorld(MAP_W / 2 - 0.5, MAP_H + 1.4); st.place(st.make('world-castle-starter'), cx, 0, cz, Math.PI).group.scale.setScalar(1.5);
  const [sx, sz] = toWorld(s.hero.x, s.hero.y), hero = st.place(st.make('hero-page', {hero: host.hero}), sx, 0, sz);
  const slimeBase = st.make('creature-slime', {variant: 'small'}), slimes = s.patrols.map(() => { const r = st.clone(slimeBase); setState(r, 'walk'); return r; });
  const eye = new Vector3(), look = new Vector3();
  const follow = (dt: number): void => { const p = hero.group.position, k = dt ? 1 - Math.exp(-dt * 5) : 1; st.eye.lerp(eye.set(p.x, 13, p.z + 9), k); st.look.lerp(look.set(p.x, 0.6, p.z), k); };
  follow(0);

  return {
    group: st.group, background: SKY,
    start: (seed = 1) => { s = startQuest(createQuest(seed)); for (const c of chests.values()) { c.rest = 'idle'; setState(c, 'idle'); } setState(hero, 'idle'); },
    auto: () => autoQuest(s),
    hud: () => ({phase: s.phase, score: s.score, message: s.message, left: `♥ ${s.hearts} · ${Math.ceil(s.timeLeft)}s`, right: QUEST.items.map((it) => `${it[0].toUpperCase() + it.slice(1)} ${s.items.includes(it) ? '✓' : '–'}`).join('  ')}),
    dispose: () => { maze.dispose(); st.dispose(); },
    step: (dt, input) => {
      stepQuest(s, input, dt);
      for (const e of s.events) {
        const [wx, wz] = toWorld(e.x ?? 0, e.z ?? 0);
        if (e.type === 'open') { const c = chests.get(`${e.x},${e.z}`); if (c) { c.rest = 'celebrate'; setState(c, 'celebrate'); st.pulse(c.group, 0.25); } } // the lid stays open
        if (e.type === 'sparkle') { st.burst(wx, 1.2, wz, C.gold, 24, 2.8); setState(hero, 'celebrate'); }
        if (e.type === 'hit') { st.burst(wx, 1, wz, C.slime, 18, 2.8); st.shake(0.5); setState(hero, 'hit'); }
        if (e.type === 'win') { setState(hero, 'celebrate'); [-3, 0, 3].forEach((x, i) => st.burst(hero.group.position.x + x, 2.4, hero.group.position.z, [C.gold, C.crimson, C.blue][i], 18, 3.4)); }
        if (e.type === 'lose') setState(hero, 'hit');
      }
      const h = s.hero, k = 1 - h.moveT / QUEST.stepEvery, [fx, fz] = toWorld(h.fromX, h.fromY), [tx, tz] = toWorld(h.x, h.y);
      hero.group.position.set(fx + (tx - fx) * k, 0, fz + (tz - fz) * k); hero.group.rotation.y = FACING[h.facing]; hero.group.visible = !(s.invuln > 0 && Math.floor(s.t * 12) % 2 === 0);
      if (s.phase === 'playing') setContinuous(hero, h.moveT > 0 ? 'walk' : 'idle');
      s.patrols.forEach((p, i) => {
        const r = slimes[i], pk = 1 - p.stepT / QUEST.patrolEvery, [ax, az] = toWorld(p.fromX, p.fromY), [bx, bz] = toWorld(p.x, p.y);
        r.group.position.set(ax + (bx - ax) * pk, 0, az + (bz - az) * pk); if (bx !== ax || bz !== az) r.group.rotation.y = Math.atan2(bx - ax, bz - az);
      });
      follow(dt); st.update(dt);
    },
  };
}
