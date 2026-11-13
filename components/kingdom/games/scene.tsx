'use client';
/** Shared scene plumbing for the games: rig ownership, the fixed-step loop, cameras and particle bursts. */
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {BoxGeometry, Group, Mesh, MeshBasicMaterial, type PerspectiveCamera, Vector3} from 'three';
import {assetById} from '@/lib/kingdom/catalog';
import type {GameEvent, Input, Phase} from '@/lib/kingdom/games/common';
import type {BuildOptions, Rig} from '@/lib/kingdom/types';
import {ONE_SHOT, setState} from '@/lib/kingdom/rig';
import {cloneRig} from '../rigCache';

export type Hud = {phase: Phase; score: number; message: string; left: string; right: string};
export type SceneProps = {runId: number; input: MutableRefObject<Input>; report: (hud: Hud) => void; seed: number};
export type GameLike = {phase: Phase; events: GameEvent[]; message: string};

/** Rigs a scene builds for itself. Everything is disposed when the scene unmounts. */
export function useSceneRigs() {
  const owned = useRef<Rig[]>([]);
  useEffect(() => { const list = owned.current; return () => { for (const r of list) { r.group.removeFromParent(); r.dispose(); } list.length = 0; }; }, []);
  return useMemo(() => ({
    make: (id: string, options: BuildOptions = {}): Rig => { const def = assetById(id); if (!def) throw new Error(`Unknown asset ${id}`); const r = def.build(options); owned.current.push(r); return r; },
    own: (r: Rig): Rig => { owned.current.push(r); return r; },
    clone: (src: Rig): Rig => { const r = cloneRig(src); owned.current.push(r); return r; },
  }), []);
}

/** Set a continuous state without interrupting a one-shot that is still playing. */
export function setContinuous(rig: Rig, state: Rig['state']): void {
  if (ONE_SHOT[rig.state] && rig.stateTime < (ONE_SHOT[rig.state] ?? 0)) return;
  if (rig.states.includes(state)) setState(rig, state);
}

export function useGameLoop<S extends GameLike>(stateRef: MutableRefObject<S>, step: (s: S, i: Input, dt: number) => S, start: (s: S) => S, input: MutableRefObject<Input>, runId: number, report: (s: S) => void, onEvents: (events: GameEvent[], s: S) => void): void {
  const acc = useRef(0);
  useEffect(() => { if (runId > 0) { start(stateRef.current); report(stateRef.current); } }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => {
    const s = stateRef.current; if (s.phase !== 'playing') return;
    step(s, input.current, Math.min(delta, 0.05));
    if (s.events.length) onEvents(s.events, s);
    acc.current += delta;
    if (acc.current > 0.1 || s.events.length || s.phase !== 'playing') { acc.current = 0; report(s); }
  });
}

export function FixedCamera({position, target, fov = 45}: {position: [number, number, number]; target: [number, number, number]; fov?: number}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const key = `${position.join(',')}|${target.join(',')}|${fov}`;
  useEffect(() => { camera.position.set(position[0], position[1], position[2]); camera.lookAt(target[0], target[1], target[2]); camera.fov = fov; camera.updateProjectionMatrix(); }, [camera, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
export function FollowCamera({target, offset, fov = 45}: {target: MutableRefObject<Vector3>; offset: [number, number, number]; fov?: number}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const look = useRef(new Vector3());
  useEffect(() => { camera.fov = fov; camera.updateProjectionMatrix(); const t = target.current; camera.position.set(t.x + offset[0], t.y + offset[1], t.z + offset[2]); look.current.copy(t); camera.lookAt(t); }, [camera, fov]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => { const t = target.current, k = 1 - Math.exp(-delta * 5); camera.position.lerp(new Vector3(t.x + offset[0], t.y + offset[1], t.z + offset[2]), k); look.current.lerp(t, k); camera.lookAt(look.current); });
  return null;
}

export type BurstApi = {spawn: (x: number, y: number, z: number, color: number, count?: number, speed?: number) => void};
type Particle = {mesh: Mesh; vel: Vector3; life: number; max: number};
/** A pool of little cubes for hits, coins and sparkles. `apiRef.current.spawn()` from event handlers. */
export function Bursts({apiRef}: {apiRef: MutableRefObject<BurstApi | null>}) {
  const pool = useMemo(() => {
    const geo = new BoxGeometry(0.09, 0.09, 0.09), group = new Group(), mats = new Map<number, MeshBasicMaterial>(), parts: Particle[] = [];
    for (let i = 0; i < 72; i++) { const m = new Mesh(geo, new MeshBasicMaterial({color: 0xffffff})); m.visible = false; group.add(m); parts.push({mesh: m, vel: new Vector3(), life: 0, max: 0.6}); }
    return {geo, group, mats, parts};
  }, []);
  useEffect(() => {
    apiRef.current = {spawn: (x, y, z, color, count = 10, speed = 2.2) => {
      let mat = pool.mats.get(color); if (!mat) { mat = new MeshBasicMaterial({color}); pool.mats.set(color, mat); }
      let n = 0;
      for (const p of pool.parts) { if (p.life > 0) continue; p.mesh.material = mat; p.mesh.visible = true; p.mesh.position.set(x, y, z); p.vel.set((Math.random() - 0.5) * 2, Math.random() * 1.2 + 0.3, (Math.random() - 0.5) * 2).multiplyScalar(speed); p.life = p.max = 0.45 + Math.random() * 0.35; p.mesh.scale.setScalar(1); if (++n >= count) break; }
    }};
    return () => { apiRef.current = null; pool.geo.dispose(); for (const m of pool.mats.values()) m.dispose(); for (const p of pool.parts) (p.mesh.material as MeshBasicMaterial).dispose?.(); };
  }, [apiRef, pool]);
  useFrame((_, delta) => {
    for (const p of pool.parts) {
      if (p.life <= 0) continue;
      p.life -= delta; p.vel.y -= 6 * delta; p.mesh.position.addScaledVector(p.vel, delta); p.mesh.rotation.x += delta * 6; p.mesh.rotation.z += delta * 4;
      const k = Math.max(0, p.life / p.max); p.mesh.scale.setScalar(0.4 + k);
      if (p.life <= 0) p.mesh.visible = false;
    }
  });
  return <primitive object={pool.group} />;
}
