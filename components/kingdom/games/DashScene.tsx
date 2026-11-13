'use client';
/** Dragon Dash scene: the dragon stays at x = 0 while towers, coins and the castle scroll past. */
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry, CylinderGeometry, Group, Mesh} from 'three';
import {DASH, createDash, startDash, stepDash} from '@/lib/kingdom/games/dash';
import {animate, setState} from '@/lib/kingdom/rig';
import {material} from '@/lib/kingdom/voxel';
import {C} from '@/lib/kingdom/palette';
import {useKingdom} from '../store';
import {ENV, Lights} from '../Preview';
import {Bursts, FixedCamera, setContinuous, useGameLoop, useSceneRigs, type BurstApi, type SceneProps} from './scene';

const POOL = 8, COINS = 30;

export function DashScene({runId, input, report, seed}: SceneProps) {
  const rigs = useSceneRigs();
  const shadows = useKingdom((s) => s.shadows);
  const world = useMemo(() => {
    const dragon = rigs.make('creature-baby-dragon', {variant: 'medium'}); dragon.group.rotation.y = Math.PI / 2; dragon.rest = 'flap'; setState(dragon, 'flap');
    const castle = rigs.make('world-castle-royal'); castle.group.rotation.y = -Math.PI / 2; castle.group.scale.setScalar(1.6);
    const stone = material('stone'), gold = material('gold');
    const unit = new BoxGeometry(1, 1, 1), cap = new BoxGeometry(1.2, 0.3, 1.2);
    const pillars: {group: Group; bottom: Mesh; top: Mesh; capB: Mesh; capT: Mesh}[] = [];
    const pillarGroup = new Group();
    for (let i = 0; i < POOL; i++) {
      const g = new Group(), bottom = new Mesh(unit, stone), top = new Mesh(unit, stone), capB = new Mesh(cap, stone), capT = new Mesh(cap, stone);
      for (const m of [bottom, top, capB, capT]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
      g.visible = false; pillarGroup.add(g); pillars.push({group: g, bottom, top, capB, capT});
    }
    const coinGeo = new CylinderGeometry(0.2, 0.2, 0.07, 12).rotateX(Math.PI / 2), coinGroup = new Group(), coins: Mesh[] = [];
    for (let i = 0; i < COINS; i++) { const m = new Mesh(coinGeo, gold); m.visible = false; coinGroup.add(m); coins.push(m); }
    const scenery = new Group(); const tree = rigs.make('world-tree-pine'), hedge = rigs.make('world-hedge');
    const trees: Group[] = []; for (let i = 0; i < 7; i++) { const t = rigs.clone(tree); t.group.position.set(i * 7 - 20, 0, -3.5 - (i % 3)); scenery.add(t.group); trees.push(t.group); }
    const hedges: Group[] = []; for (let i = 0; i < 16; i++) { const h = rigs.clone(hedge); h.group.position.set(i * 3 - 24, 0, -1.6); scenery.add(h.group); hedges.push(h.group); }
    return {dragon, castle, pillars, pillarGroup, coinGroup, coins, scenery, trees, hedges, unit, cap, coinGeo};
  }, [rigs]);
  const stateRef = useRef(createDash(seed));
  const bursts = useRef<BurstApi | null>(null);
  useGameLoop(stateRef, stepDash, startDash, input, runId,
    (s) => report({phase: s.phase, score: s.score, message: s.message, left: `♥ ${s.lives}`, right: `${Math.min(DASH.goal, Math.round(s.dist))} / ${DASH.goal} m · ${s.coins} gold`}),
    (events, s) => {
      for (const e of events) {
        if (e.type === 'flap') setState(world.dragon, 'jump');
        if (e.type === 'coin') bursts.current?.spawn(0, e.y ?? s.y, 0, C.gold, 8, 1.6);
        if (e.type === 'hit') { setState(world.dragon, 'hit'); bursts.current?.spawn(0, s.y, 0, C.crimson, 14); }
        if (e.type === 'win') setState(world.dragon, 'celebrate');
        if (e.type === 'lose') setState(world.dragon, 'hit');
      }
    });
  useFrame((_, delta) => {
    const s = stateRef.current, dt = Math.min(delta, 0.05), d = s.dist;
    world.dragon.group.position.y = s.y - 0.3; world.dragon.group.rotation.z = Math.max(-0.45, Math.min(0.45, s.vy * 0.07));
    world.dragon.group.visible = !(s.invuln > 0 && Math.floor(s.t * 12) % 2 === 0);
    if (s.phase === 'playing') setContinuous(world.dragon, 'flap');
    animate(world.dragon, dt, 1);
    for (let i = 0; i < POOL; i++) {
      const p = s.pillars[i], e = world.pillars[i]; e.group.visible = !!p; if (!p) continue;
      const bottomH = Math.max(0.2, p.gapY - DASH.gap), topY = p.gapY + DASH.gap, topH = Math.max(0.2, DASH.ceil + 1.5 - topY);
      e.group.position.x = p.x - d;
      e.bottom.scale.set(DASH.pillarW, bottomH, DASH.pillarW); e.bottom.position.y = bottomH / 2; e.capB.position.y = bottomH + 0.15;
      e.top.scale.set(DASH.pillarW, topH, DASH.pillarW); e.top.position.y = topY + topH / 2; e.capT.position.y = topY - 0.15;
    }
    for (let i = 0; i < COINS; i++) { const c = s.coinList[i], m = world.coins[i]; m.visible = !!c && !c.taken; if (c) { m.position.set(c.x - d, c.y, 0); m.rotation.y += dt * 3; } }
    world.castle.group.position.x = DASH.goal + 5 - d;
    world.trees.forEach((t, i) => { t.position.x = (((i * 7 - d * 0.6) % 49) + 49) % 49 - 24; });
    world.hedges.forEach((h, i) => { h.position.x = (((i * 3 - d) % 48) + 48) % 48 - 24; });
  });
  return (
    <>
      <color attach="background" args={[ENV.meadow.bg]} />
      <Lights env="meadow" shadows={shadows} radius={12} />
      <FixedCamera position={[1.8, 3.3, 11.5]} target={[1.8, 3.1, 0]} fov={38} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 30]} /><meshStandardMaterial color={ENV.meadow.ground} roughness={1} /></mesh>
      <primitive object={world.scenery} />
      <primitive object={world.pillarGroup} />
      <primitive object={world.coinGroup} />
      <primitive object={world.castle.group} />
      <primitive object={world.dragon.group} />
      <Bursts apiRef={bursts} />
    </>
  );
}
