'use client';
/**
 * The Turf arena as a kingdom board: the shared scene from lib/kingdom/scenes/territory. Every map cell is a tile, a
 * player's land rises in their colour, and a newly closed loop ripples up. Same privacy as the map: cells and owners
 * only, plus the viewer's own open trail.
 */
import {Component, useEffect, useMemo, type ReactNode} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {ACESFilmicToneMapping, PCFSoftShadowMap, type PerspectiveCamera, SRGBColorSpace} from 'three';
import {castHero} from '@/lib/kingdom/cast';
import {createTerritory} from '@/lib/kingdom/scenes';
import {arenaCells, cellCenter, type Arena} from '@/lib/turf/engine';
import type {TurfPlayer} from '@/lib/turf/types';

type Props = {arena: Arena; players: TurfPlayer[]; cells: [string, number][]; trail: string[]; viewerId: number; reducedMotion?: boolean; onError?: () => void};
const M_PER_DEG = 111_320;

function Board({arena, players, cells, trail, viewerId, reducedMotion}: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera, gl = useThree((s) => s.gl);
  useEffect(() => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace; gl.shadowMap.type = PCFSoftShadowMap; }, [gl]);
  const arenaKey = `${arena.center.lat},${arena.center.lng},${arena.radiusKm}`, roster = players.filter((p) => p.status === 'accepted'), rosterKey = roster.map((p) => `${p.id}:${p.name}:${p.color}`).join('|');
  // built once per arena and roster; owners and the trail arrive through setOwners / setTrail so a poll never rebuilds the board
  const land = useMemo(() => {
    const k = Math.cos((arena.center.lat * Math.PI) / 180);
    const grid = arenaCells(arena).map((key) => { const p = cellCenter(key); return {key, x: (p.lng - arena.center.lng) * M_PER_DEG * k, z: -(p.lat - arena.center.lat) * M_PER_DEG}; }); // metres east and south
    return createTerritory({camera}, {cells: grid, kingdoms: roster.map((p) => ({id: p.id, name: p.name, color: parseInt(p.color.slice(1), 16), cast: castHero(p.name)})), owners: cells, viewerId});
  }, [camera, arenaKey, rosterKey, viewerId]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the arena and roster, not object identity
  useEffect(() => () => land.dispose(), [land]);
  useEffect(() => land.setOwners(cells), [land, cells]);
  useEffect(() => land.setTrail(trail), [land, trail]);
  useFrame((_, delta) => land.step(Math.min(delta, 0.05), reducedMotion ? 0.35 : 1));
  return (
    <>
      <color attach="background" args={[land.background]} />
      <primitive object={land.group} />
    </>
  );
}

class Boundary extends Component<{onError?: () => void; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function KingdomView(props: Props) {
  return (
    <Boundary onError={props.onError}>
      <Canvas dpr={[1, 2]} shadows camera={{fov: 40, near: 0.5, far: 2000, position: [0, 30, 30]}} gl={{antialias: true}}
        onCreated={({gl}) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); props.onError?.(); }); }}>
        <Board {...props} />
      </Canvas>
    </Boundary>
  );
}
