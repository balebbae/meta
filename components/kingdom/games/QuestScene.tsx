'use client';
/** Royal Quest scene: a merged terrain board, hedge maze, chests, patrolling slimes and a camera that follows the hero. */
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group, Vector3} from 'three';
import {MAP, MAP_H, MAP_W, QUEST, createQuest, startQuest, stepQuest} from '@/lib/kingdom/games/quest';
import {buildTerrain, cellToWorld} from '@/lib/kingdom/factories/terrain';
import {animate, setState} from '@/lib/kingdom/rig';
import {C} from '@/lib/kingdom/palette';
import {getTheme} from '@/lib/kingdom/theme';
import type {Rig} from '@/lib/kingdom/types';
import {useKingdom} from '../store';
import {ENV, Lights} from '../Preview';
import {Bursts, FollowCamera, setContinuous, useGameLoop, useSceneRigs, type BurstApi, type SceneProps} from './scene';

const FACING: Record<'n' | 's' | 'e' | 'w', number> = {s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2};
const toWorld = (x: number, y: number): [number, number] => cellToWorld(x, y, MAP_W, MAP_H);

export function QuestScene({runId, input, report, seed}: SceneProps) {
  const rigs = useSceneRigs();
  const shadows = useKingdom((s) => s.shadows);
  const theme = getTheme();
  const world = useMemo(() => {
    const hero = useKingdom.getState().hero;
    const player = rigs.make(theme.roles.starter, {hero});
    const terrain = rigs.own(buildTerrain(MAP, {'#': 'hedge', '.': 'grass', S: 'grass', C: 'grass', T: 'grass', R: 'grass', ':': 'path', G: 'path', '~': 'water'}, seed));
    const scenery = new Group();
    const tree = rigs.make('world-tree-round'), rock = rigs.make('world-rock'), chestBase = rigs.make('world-chest');
    const chests = new Map<string, {rig: Rig; open: boolean}>();
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const ch = MAP[y][x], [wx, wz] = toWorld(x, y);
      if (ch === 'T') { const t = rigs.clone(tree); t.group.position.set(wx, 0, wz); t.group.rotation.y = (x * 7 + y) % 6; scenery.add(t.group); }
      if (ch === 'R') { const r = rigs.clone(rock); r.group.position.set(wx, 0, wz); scenery.add(r.group); }
      if (ch === 'C') { const c = rigs.clone(chestBase); c.group.position.set(wx, 0, wz); c.group.rotation.y = Math.PI; scenery.add(c.group); chests.set(`${x},${y}`, {rig: c, open: false}); }
    }
    const castle = rigs.make('world-castle-starter'); const [cx, cz] = toWorld(MAP_W / 2 - 0.5, MAP_H + 2.2); castle.group.position.set(cx, 0, cz); castle.group.rotation.y = Math.PI; scenery.add(castle.group);
    const slimeBase = rigs.make('creature-slime', {variant: 'small'}); slimeBase.group.scale.setScalar(1.7 / slimeBase.group.userData.creature.scale); // shortcut: maze corridors are 1 m wide so patrol slimes stay 1.5 m wide, widen the maze to let them tower
    const slimes: Rig[] = [0, 1, 2].map(() => { const r = rigs.clone(slimeBase); scenery.add(r.group); setState(r, 'walk'); return r; });
    return {player, terrain, scenery, chests, slimes};
  }, [rigs, seed, theme]);
  const stateRef = useRef(createQuest(seed));
  const bursts = useRef<BurstApi | null>(null);
  const focus = useRef(new Vector3());
  useGameLoop(stateRef, stepQuest, startQuest, input, runId,
    (s) => report({phase: s.phase, score: s.score, message: s.message, left: `♥ ${s.hearts} · ${Math.ceil(s.timeLeft)}s`, right: QUEST.items.map((it) => `${it[0].toUpperCase() + it.slice(1)} ${s.items.includes(it) ? '✓' : '–'}`).join('  ')}),
    (events) => {
      for (const e of events) {
        if (e.type === 'open') { const c = world.chests.get(`${e.x},${e.z}`); if (c) { c.open = true; c.rig.pivots.lid.rotation.x = -1.9; } }
        if (e.type === 'sparkle') { const [wx, wz] = toWorld(e.x ?? 0, e.z ?? 0); bursts.current?.spawn(wx, 0.7, wz, C.gold, 18, 2.4); setState(world.player, 'celebrate'); }
        if (e.type === 'hit') { const [wx, wz] = toWorld(e.x ?? 0, e.z ?? 0); bursts.current?.spawn(wx, 0.8, wz, C.slime, 14); setState(world.player, 'hit'); }
        if (e.type === 'win') setState(world.player, 'celebrate');
        if (e.type === 'lose') setState(world.player, 'hit');
      }
    });
  useFrame((_, delta) => {
    const s = stateRef.current, dt = Math.min(delta, 0.05), h = s.hero;
    const k = 1 - h.moveT / QUEST.stepEvery, [fx, fz] = toWorld(h.fromX, h.fromY), [tx, tz] = toWorld(h.x, h.y);
    world.player.group.position.set(fx + (tx - fx) * k, 0, fz + (tz - fz) * k);
    world.player.group.rotation.y = FACING[h.facing];
    world.player.group.visible = !(s.invuln > 0 && Math.floor(s.t * 12) % 2 === 0);
    if (s.phase === 'playing') setContinuous(world.player, h.moveT > 0 ? 'walk' : 'idle');
    animate(world.player, dt, 1);
    focus.current.set(world.player.group.position.x, 0, world.player.group.position.z);
    s.patrols.forEach((p, i) => { const r = world.slimes[i]; if (!r) return; const pk = 1 - p.stepT / QUEST.patrolEvery, [ax, az] = toWorld(p.fromX, p.fromY), [bx, bz] = toWorld(p.x, p.y); r.group.position.set(ax + (bx - ax) * pk, 0, az + (bz - az) * pk); if (bx !== ax || bz !== az) r.group.rotation.y = Math.atan2(bx - ax, bz - az); animate(r, dt, 1); });
    for (const c of world.chests.values()) if (!c.open) animate(c.rig, dt, 1);
  });
  return (
    <>
      <color attach="background" args={[ENV.meadow.bg]} />
      <Lights env="meadow" shadows={shadows} radius={9} />
      <FollowCamera target={focus} offset={[0, 8.6, 5.6]} fov={42} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]} receiveShadow><planeGeometry args={[60, 60]} /><meshStandardMaterial color={ENV.meadow.ground} roughness={1} /></mesh>
      <primitive object={world.terrain.group} />
      <primitive object={world.scenery} />
      <primitive object={world.player.group} />
      <Bursts apiRef={bursts} />
    </>
  );
}
