'use client';
/** Castle Defense scene: the gate and walls behind the camera's shoulder, three lanes running away, cloned creatures walking in. */
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group} from 'three';
import {DEFENSE, createDefense, startDefense, stepDefense} from '@/lib/kingdom/games/defense';
import {buildTerrain} from '@/lib/kingdom/factories/terrain';
import {animate, setState} from '@/lib/kingdom/rig';
import {C} from '@/lib/kingdom/palette';
import {getTheme} from '@/lib/kingdom/theme';
import type {CreatureKind, Rig, Variant} from '@/lib/kingdom/types';
import {useKingdom} from '../store';
import {ENV, Lights} from '../Preview';
import {Bursts, FixedCamera, setContinuous, useGameLoop, useSceneRigs, type BurstApi, type SceneProps} from './scene';

const KIND_ID: Record<CreatureKind, string> = {slime: 'creature-slime', goblin: 'creature-goblin', cyclops: 'creature-cyclops', giant: 'creature-giant', babyDragon: 'creature-baby-dragon', elderDragon: 'creature-elder-dragon'};
const FIELD = Array.from({length: 20}, (_, i) => (i === 0 ? 'FFFFFFFFFFF' : 'FGPGPGPGGFF'.replace(/G/g, '.').replace(/F/g, 'F')));

export function DefenseScene({runId, input, report, seed}: SceneProps) {
  const rigs = useSceneRigs();
  const shadows = useKingdom((s) => s.shadows);
  const theme = getTheme();
  const world = useMemo(() => {
    const hero = useKingdom.getState().hero;
    const player = rigs.make(theme.roles.defender, {hero}); player.group.position.set(0, 0, DEFENSE.playerZ);
    const terrain = rigs.own(buildTerrain(FIELD, {F: 'flowers', '.': 'grass', P: 'path'}, seed)); terrain.group.position.z = 9.6 - 0.48;
    const scenery = new Group();
    const gate = rigs.make('world-gate'); gate.group.position.set(0, 0, -0.2); scenery.add(gate.group);
    const wall = rigs.make('world-wall'); for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const w = rigs.clone(wall); w.group.position.set(s * (1.4 + i * 0.96), 0, -0.2); scenery.add(w.group); }
    const tower = rigs.make('world-tower'); for (const s of [-1, 1]) { const t = rigs.clone(tower); t.group.position.set(s * 6.4, 0, -0.2); scenery.add(t.group); }
    const tree = rigs.make('world-tree-round'); for (let i = 0; i < 6; i++) { const t = rigs.clone(tree); t.group.position.set((i % 2 ? 1 : -1) * (5.2 + (i % 3) * 0.4), 0, 3 + i * 2.6); scenery.add(t.group); }
    const bases = new Map<string, Rig>(), enemies = new Map<number, Rig>(), enemyGroup = new Group();
    return {player, terrain, scenery, bases, enemies, enemyGroup};
  }, [rigs, seed, theme]);
  const stateRef = useRef(createDefense(seed));
  const bursts = useRef<BurstApi | null>(null);
  const baseFor = (kind: CreatureKind, variant: Variant): Rig => { const k = `${kind}:${variant}`; let b = world.bases.get(k); if (!b) { b = rigs.make(KIND_ID[kind], {variant}); world.bases.set(k, b); } return b; };
  useGameLoop(stateRef, stepDefense, startDefense, input, runId,
    (s) => report({phase: s.phase, score: s.score, message: s.message, left: `Wave ${Math.max(1, s.wave)} / 5 · Gate ♥ ${s.gateHp}`, right: `Kills ${s.kills}`}),
    (events, s) => {
      for (const e of events) {
        if (e.type === 'swing') setState(world.player, 'attack');
        if (e.type === 'hit') bursts.current?.spawn(e.x ?? 0, 0.9, e.z ?? 0, C.sparkle, 10);
        if (e.type === 'puff') bursts.current?.spawn(e.x ?? 0, 0.6, e.z ?? 0, C.slime, 18, 2.6);
        if (e.type === 'stomp') { bursts.current?.spawn(e.x ?? 0, 0.8, 0.4, C.crimson, 12); const en = s.enemies.find((n) => n.state === 'attack' && DEFENSE.laneX[n.lane] === e.x); const r = en ? world.enemies.get(en.id) : null; if (r) setState(r, r.states.includes('stomp') ? 'stomp' : 'attack'); }
        if (e.type === 'win') setState(world.player, 'celebrate');
        if (e.type === 'lose') setState(world.player, 'hit');
      }
    });
  useFrame((_, delta) => {
    const s = stateRef.current, dt = Math.min(delta, 0.05);
    const px = DEFENSE.laneX[s.lane]; world.player.group.position.x += (px - world.player.group.position.x) * (1 - Math.exp(-dt * 14));
    animate(world.player, dt, 1);
    const seen = new Set<number>();
    for (const en of s.enemies) {
      seen.add(en.id);
      let r = world.enemies.get(en.id);
      if (!r) { r = rigs.clone(baseFor(en.kind, en.variant)); r.group.rotation.y = Math.PI; world.enemyGroup.add(r.group); world.enemies.set(en.id, r); setState(r, r.species === 'dragon' ? 'flap' : 'walk'); }
      r.group.position.x = DEFENSE.laneX[en.lane]; r.group.position.z = en.z;
      if (en.state === 'dead') { if (r.state !== 'hit') setState(r, 'hit'); r.group.position.y -= dt * 1.4; r.group.scale.setScalar(Math.max(0.01, r.group.scale.x - dt * 1.2)); }
      else { r.group.position.y = en.hitT > 0 ? 0.05 : 0; r.group.scale.setScalar(en.hitT > 0 ? 1.06 : 1); if (en.state === 'walk') setContinuous(r, r.species === 'dragon' ? 'flap' : 'walk'); else if (r.state === 'walk' || r.state === 'flap') setState(r, 'idle'); }
      animate(r, dt, 1);
    }
    for (const [id, r] of world.enemies) if (!seen.has(id)) { r.group.removeFromParent(); r.dispose(); world.enemies.delete(id); }
  });
  return (
    <>
      <color attach="background" args={[ENV.meadow.bg]} />
      <Lights env="meadow" shadows={shadows} radius={14} />
      <FixedCamera position={[0, 8.2, -7.6]} target={[0, 0.6, 6]} fov={46} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 8]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color={ENV.meadow.ground} roughness={1} /></mesh>
      <primitive object={world.terrain.group} />
      <primitive object={world.scenery} />
      <primitive object={world.enemyGroup} />
      <primitive object={world.player.group} />
      <Bursts apiRef={bursts} />
    </>
  );
}
