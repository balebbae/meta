'use client';
/** Tournament Joust scene: two riders on a sand list with a hedge tilt; the lance follows the chosen height. */
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry, Group, Mesh, Vector3} from 'three';
import {JOUST, createJoust, joustScore, startJoust, stepJoust} from '@/lib/kingdom/games/joust';
import {buildTerrain} from '@/lib/kingdom/factories/terrain';
import {animate, setState} from '@/lib/kingdom/rig';
import {softMaterial} from '@/lib/kingdom/factories/soft';
import {C} from '@/lib/kingdom/palette';
import {getTheme} from '@/lib/kingdom/theme';
import {useKingdom} from '../store';
import {ENV, Lights} from '../Preview';
import {Bursts, FixedCamera, setContinuous, useGameLoop, useSceneRigs, type BurstApi, type SceneProps} from './scene';

const LIST = ['FFFFFFFFFFFFFFFFFFFFFFF', 'SSSSSSSSSSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSSSSSSSSSS', 'FFFFFFFFFFFFFFFFFFFFFFF'];

export function JoustScene({runId, input, report, seed}: SceneProps) {
  const rigs = useSceneRigs();
  const shadows = useKingdom((s) => s.shadows);
  const theme = getTheme();
  const world = useMemo(() => {
    const hero = useKingdom.getState().hero;
    const player = rigs.make(theme.roles.mount, {rider: true, hero});
    player.group.rotation.y = Math.PI / 2; player.group.position.z = 0.75;
    const foe = rigs.make('mount-royal'); foe.group.rotation.y = -Math.PI / 2; foe.group.position.z = -0.75;
    const goblin = rigs.make(theme.roles.smallEnemy, {variant: 'boss'}); goblin.group.position.set(0, -0.16, 0); foe.pivots.rider.add(goblin.group); foe.attached = [goblin];
    const terrain = rigs.own(buildTerrain(LIST, {F: 'flowers', S: 'sand'}, seed));
    const scenery = new Group();
    const fence = rigs.make('world-fence'); for (let i = -11; i <= 11; i++) for (const z of [-2.4, 2.4]) { const f = rigs.clone(fence); f.group.position.set(i * 0.96 - 0.48, 0, z); scenery.add(f.group); }
    const hedge = rigs.make('world-hedge'); for (let i = -9; i <= 9; i++) { const h = rigs.clone(hedge); h.group.position.set(i * 0.48, 0, 0); scenery.add(h.group); }
    for (const [x, id] of [[-7, 'world-tent'], [7, 'world-tent'], [0, 'world-banner'], [-3.5, 'world-banner'], [3.5, 'world-banner']] as const) { const r = rigs.make(id); r.group.position.set(x, 0, -4.6); scenery.add(r.group); }
    const tree = rigs.make('world-tree-round'); for (const x of [-10, -5, 5, 10]) { const t = rigs.clone(tree); t.group.position.set(x, 0, -6.5); scenery.add(t.group); }
    const lanceGeo = new BoxGeometry(0.07, 0.07, 2.3).translate(0, 0, 1.0);
    const lance = new Mesh(lanceGeo, softMaterial('wood', C.wood)); lance.castShadow = true; const lancePivot = new Group(); lancePivot.position.set(-0.3, 1.05, 0.45); lancePivot.add(lance); player.group.add(lancePivot);
    const foeLance = new Mesh(lanceGeo, softMaterial('wood', C.wood)); const foeLancePivot = new Group(); foeLancePivot.position.set(-0.3, 1.0, 0.45); foeLancePivot.add(foeLance); foe.group.add(foeLancePivot);
    const marker = new Mesh(new BoxGeometry(0.22, 0.22, 0.08), softMaterial('gold', C.gold)); marker.visible = false; marker.position.set(-0.32, 1.0, 0.55); foe.group.add(marker);
    return {player, foe, goblin, terrain, scenery, lancePivot, foeLancePivot, marker, lanceGeo};
  }, [rigs, seed, theme]);
  const stateRef = useRef(createJoust(seed));
  const bursts = useRef<BurstApi | null>(null);
  const hero = world.player.attached?.[0];
  useGameLoop(stateRef, stepJoust, startJoust, input, runId,
    (s) => report({phase: s.phase, score: joustScore(s), message: s.message, left: `Pass ${Math.max(1, s.pass)} / ${JOUST.passes}`, right: `${s.playerScore} – ${s.foeScore} · lance ${['low', 'mid', 'high'][s.playerLane]}`}),
    (events, s) => {
      for (const e of events) {
        if (e.type === 'swing' && hero) setState(hero, 'attack');
        if (e.type === 'hit') {
          bursts.current?.spawn(0, 1.1, 0, e.value && e.value > 0 ? C.sparkle : C.crimson, e.value ? 16 : 10);
          if (e.value === 0) { if (hero) setState(hero, 'hit'); setState(world.player, 'hit'); } else { setState(world.goblin, 'hit'); if (e.value === 3) setState(world.foe, 'hit'); }
        }
        if (e.type === 'sparkle') bursts.current?.spawn(0, 1.6, 0, C.gold, 20, 2.8);
        if (e.type === 'win') { if (hero) setState(hero, 'celebrate'); setState(world.player, 'celebrate'); }
        if (e.type === 'lose') setState(world.goblin, 'celebrate');
      }
      void s;
    });
  useFrame((_, delta) => {
    const s = stateRef.current, dt = Math.min(delta, 0.05);
    world.player.group.position.x = s.playerX; world.foe.group.position.x = s.foeX;
    const running = s.phase === 'playing' && s.passT < JOUST.passLen - 0.15;
    setContinuous(world.player, running ? 'run' : 'idle'); setContinuous(world.foe, running ? 'run' : 'idle');
    const goal = -(s.playerLane - 1) * 0.24; world.lancePivot.rotation.x += (goal - world.lancePivot.rotation.x) * (1 - Math.exp(-dt * 12));
    world.foeLancePivot.rotation.x = -(s.foeOpening - 1) * 0.1;
    world.marker.visible = s.phase === 'playing' && s.openingShown && !s.resolved; world.marker.position.y = JOUST.laneY[s.foeOpening] + 0.35;
    for (const r of [world.player, world.foe, world.goblin, ...(world.player.attached ?? [])]) animate(r, dt, 1);
  });
  return (
    <>
      <color attach="background" args={[ENV.meadow.bg]} />
      <Lights env="meadow" shadows={shadows} radius={13} />
      <FixedCamera position={[0, 4.8, 11]} target={[0, 0.9, 0]} fov={40} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color={ENV.meadow.ground} roughness={1} /></mesh>
      <primitive object={world.terrain.group} />
      <primitive object={world.scenery} />
      <primitive object={world.player.group} />
      <primitive object={world.foe.group} />
      <Bursts apiRef={bursts} />
    </>
  );
}
