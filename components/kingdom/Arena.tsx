'use client';
/**
 * The Rally boss fight on the quest page: the shared scene from lib/kingdom/scenes/bossfight. The squad faces the quest's
 * kaiju, and every move a member logs in real life is passed in as a strike: one swing per rep.
 */
import {Component, useEffect, useMemo, useRef, type ReactNode} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {ACESFilmicToneMapping, PCFSoftShadowMap, type PerspectiveCamera, SRGBColorSpace} from 'three';
import type {Cast} from '@/lib/kingdom/cast';
import {createBossFight} from '@/lib/kingdom/scenes';
import type {WorldId} from '@/lib/kingdom/scenes/worlds';

export type ArenaHero = {id: number; name: string; cast: Cast};
/** A logged move to play: `id` only has to grow, so each one is played once. */
export type ArenaStrike = {id: number; userId: number; damage: number; reps: number; critical: boolean};
export type ArenaProps = {boss: Cast; bossName: string; hp: number; hpLeft: number; heroes: ArenaHero[]; strikes: ArenaStrike[]; /** Where the fight is set; the kingdom when left out. */ world?: WorldId; reducedMotion?: boolean; onError?: () => void};

function Fight({boss, bossName, hp, hpLeft, heroes, strikes, world, reducedMotion}: ArenaProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera, gl = useThree((s) => s.gl);
  useEffect(() => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace; gl.shadowMap.type = PCFSoftShadowMap; }, [gl]);
  const heroKey = heroes.map((h) => `${h.id}:${h.name}:${h.cast.assetId}:${JSON.stringify(h.cast.options)}`).join(',');
  // built once per cast; later health arrives through setHp so a poll never rebuilds the scene
  const fight = useMemo(() => createBossFight({camera, world}, {boss, name: bossName, hp, hpLeft, fighters: heroes}), [camera, boss.assetId, bossName, hp, heroKey, world]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the cast, not object identity
  useEffect(() => () => fight.dispose(), [fight]);
  const played = useRef(0);
  useEffect(() => { for (const s of strikes) if (s.id > played.current) { played.current = s.id; fight.strike(s.userId, s.damage, s.reps, s.critical); } fight.setHp(hpLeft); }, [fight, strikes, hpLeft]);
  useFrame((_, delta) => fight.step(Math.min(delta, 0.05), reducedMotion ? 0.35 : 1));
  return (
    <>
      <color attach="background" args={[fight.background]} />
      <primitive object={fight.group} />
    </>
  );
}

class Boundary extends Component<{onError?: () => void; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Arena(props: ArenaProps) {
  return (
    <Boundary onError={props.onError}>
      <Canvas dpr={[1, 2]} shadows camera={{fov: 30, near: 0.1, far: 160, position: [0, 3, 14]}} gl={{antialias: true}}
        onCreated={({gl}) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); props.onError?.(); }); }}>
        <Fight {...props} />
      </Canvas>
    </Boundary>
  );
}
