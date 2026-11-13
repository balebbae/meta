'use client';
/** One R3F wrapper for all four games. The scenes are plain three (lib/kingdom/scenes), so the app and the character sheet run the same code. */
import {useEffect, useMemo, type MutableRefObject} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import type {PerspectiveCamera} from 'three';
import type {GameId, Input} from '@/lib/kingdom/games/common';
import {createGameScene, type Hud} from '@/lib/kingdom/scenes';
import {useKingdom} from '../store';

export type {Hud};
export function GameScene({game, runId, input, report, seed}: {game: GameId; runId: number; input: MutableRefObject<Input>; report: (hud: Hud) => void; seed: number}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useMemo(() => createGameScene(game, {camera, hero: useKingdom.getState().hero}), [game, camera]);
  useEffect(() => () => scene.dispose(), [scene]);
  useEffect(() => { if (runId > 0) { scene.start(seed); report(scene.hud()); } }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps -- a new run starts when runId changes
  useFrame((_, delta) => { scene.step(Math.min(delta, 0.05), input.current); report(scene.hud()); });
  return (
    <>
      <color attach="background" args={[scene.background]} />
      <primitive object={scene.group} />
    </>
  );
}
