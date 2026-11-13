'use client';
/**
 * The gallery's one WebGL canvas: lights, ground, the selected rig, camera presets and a scale post.
 * Rigs are owned by rigCache; this component only parents, animates and frames them.
 */
import {Component, useEffect, useMemo, useRef, type ComponentRef, type ReactNode} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping, Box3, DirectionalLight, Group, PCFSoftShadowMap, SRGBColorSpace, Vector3, type WebGLRenderer} from 'three';
import {animate, setState} from '@/lib/kingdom/rig';
import {buildFence, buildShrub, buildTile, buildTree} from '@/lib/kingdom/factories/world';
import type {Rig} from '@/lib/kingdom/types';
import {useKingdom, type CameraPreset, type Environment, type ShadowQuality} from './store';

/** Scene palettes live with the 3D code, like lib/kingdom/palette.ts; UI chrome stays on the --fb tokens. */
export const ENV: Record<Environment, {bg: string; ground: string; sky: string; groundLight: string; key: string; keyI: number; exposure: number; rim: string}> = {
  studio: {bg: '#f7efe6', ground: '#efe4d6', sky: '#fff4ea', groundLight: '#d8c7b5', key: '#fff1dc', keyI: 2.4, exposure: 1.05, rim: '#bfd3ff'},
  meadow: {bg: '#cfe7ff', ground: '#9fd27a', sky: '#e8f4ff', groundLight: '#86b96a', key: '#fff6e2', keyI: 2.6, exposure: 1.0, rim: '#dfe9ff'},
  dusk: {bg: '#2b2a4a', ground: '#3b3558', sky: '#6c6aa8', groundLight: '#2b2440', key: '#ffb37a', keyI: 2.2, exposure: 0.95, rim: '#7f8dff'},
};
const SHADOW_SIZE: Record<ShadowQuality, number> = {off: 0, low: 1024, high: 2048};

function Renderer({env, shadows}: {env: Environment; shadows: ShadowQuality}) {
  const gl = useThree((s) => s.gl) as WebGLRenderer;
  useEffect(() => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace; gl.shadowMap.type = PCFSoftShadowMap; }, [gl]);
  useEffect(() => { gl.toneMappingExposure = ENV[env].exposure; }, [gl, env]);
  useEffect(() => { gl.shadowMap.enabled = shadows !== 'off'; gl.shadowMap.needsUpdate = true; }, [gl, shadows]);
  return null;
}

export function Lights({env, shadows, radius = 8}: {env: Environment; shadows: ShadowQuality; radius?: number}) {
  const key = useRef<DirectionalLight>(null);
  const e = ENV[env];
  useEffect(() => {
    const l = key.current; if (!l) return;
    const n = SHADOW_SIZE[shadows];
    l.castShadow = n > 0;
    if (n > 0) { l.shadow.mapSize.set(n, n); l.shadow.map?.dispose(); l.shadow.map = null; }
    l.shadow.bias = -0.0006; l.shadow.normalBias = 0.02;
    Object.assign(l.shadow.camera, {left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 40}); l.shadow.camera.updateProjectionMatrix();
  }, [shadows, radius]);
  return (
    <>
      <hemisphereLight args={[e.sky, e.groundLight, 0.9]} />
      <directionalLight ref={key} color={e.key} intensity={e.keyI} position={[-4, 8, 5]} />
      <directionalLight color={e.rim} intensity={0.9} position={[5, 5, -5]} />
      <directionalLight color="#ffe6f0" intensity={0.5} position={[5, 2, 6]} />
    </>
  );
}

function Ground({env}: {env: Environment}) {
  const scenery = useMemo(() => {
    if (env !== 'meadow') return null;
    const g = new Group(); const rigs: Rig[] = [];
    const add = (rig: Rig, x: number, z: number, ry = 0) => { rig.group.position.set(x, 0, z); rig.group.rotation.y = ry; g.add(rig.group); rigs.push(rig); };
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const d = Math.hypot(i, j); if (d < 3.6) add(buildTile(d > 2.4 && (i + j) % 2 ? 'flowers' : 'grass', 10 + i * 7 + j), i * 0.96, j * 0.96); }
    add(buildTree('round', 3), -3.1, -2.4); add(buildTree('pink', 4), 3.0, -2.6); add(buildTree('pine', 5), 0.4, -3.3, 0.4);
    add(buildShrub(6), -2.6, 1.9); add(buildShrub(7), 2.7, 2.1); add(buildFence(), -1.9, -3.1);
    return {g, dispose: () => { for (const r of rigs) r.dispose(); }};
  }, [env]);
  useEffect(() => () => scenery?.dispose(), [scenery]);
  return (
    <group>
      {env === 'studio' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[40, 48]} /><shadowMaterial opacity={0.22} /></mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow><circleGeometry args={[40, 48]} /><meshStandardMaterial color={ENV[env].ground} roughness={1} /></mesh>
      )}
      {scenery ? <primitive object={scenery.g} /> : null}
    </group>
  );
}

function RigView({rig, anim, motion}: {rig: Rig; anim: Rig['state']; motion: number}) {
  useEffect(() => { if (rig.states.includes(anim)) setState(rig, anim); for (const a of rig.attached ?? []) setState(a, 'idle'); }, [rig, anim]);
  useFrame((_, delta) => { const dt = Math.min(delta, 0.05); animate(rig, dt, motion); for (const a of rig.attached ?? []) animate(a, dt, motion); });
  return <primitive object={rig.group} />;
}

/** A 2 m post with 0.5 m rings beside the asset; the page hero is about 2.2 m tall. */
export function ScalePost({x}: {x: number}) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 2, 10]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>
      {[0.5, 1, 1.5].map((y) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.07, 0.018, 8, 20]} /><meshStandardMaterial color="#2d6cdf" /></mesh>)}
      <mesh position={[0, 2, 0]}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color="#f29a3a" /></mesh>
    </group>
  );
}

function CameraRig({rig, preset, nonce, autoRotate, reducedMotion}: {rig: Rig | null; preset: CameraPreset; nonce: number; autoRotate: boolean; reducedMotion: boolean}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const goal = useRef<{pos: Vector3; target: Vector3; active: boolean}>({pos: new Vector3(3, 2, 4), target: new Vector3(0, 1, 0), active: false});
  useEffect(() => {
    if (!rig) return;
    const box = new Box3().setFromObject(rig.group), size = box.getSize(new Vector3());
    const h = Math.max(size.y, 0.6), w = Math.max(size.x, size.z, 0.6), d = Math.max(h * 2.1, w * 1.7) + 0.6, ty = h * 0.5;
    const pos = preset === 'front' ? new Vector3(0, h * 0.55, d) : preset === 'side' ? new Vector3(d, h * 0.55, 0) : new Vector3(d * 0.72, h * 0.8, d * 0.72);
    goal.current = {pos, target: new Vector3(0, ty, 0), active: true};
    if (reducedMotion) { camera.position.copy(pos); controls.current?.target.copy(goal.current.target); controls.current?.update(); goal.current.active = false; }
  }, [rig, preset, nonce, camera, reducedMotion]);
  useFrame((_, delta) => {
    const g = goal.current, c = controls.current; if (!g.active || !c) return;
    const k = 1 - Math.exp(-delta * 7);
    camera.position.lerp(g.pos, k); c.target.lerp(g.target, k); c.update();
    if (camera.position.distanceTo(g.pos) < 0.01) g.active = false;
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} autoRotate={autoRotate && !reducedMotion} autoRotateSpeed={1.2} minDistance={0.8} maxDistance={40} maxPolarAngle={Math.PI * 0.52} />;
}

class CanvasBoundary extends Component<{onError: (msg: string) => void; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(err: Error) { this.props.onError(err.message || 'The 3D view crashed.'); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Preview({rig, onError}: {rig: Rig | null; onError: (msg: string) => void}) {
  const anim = useKingdom((s) => s.anim), env = useKingdom((s) => s.environment), shadows = useKingdom((s) => s.shadows), scaleRef = useKingdom((s) => s.scaleRef);
  const preset = useKingdom((s) => s.cameraPreset), nonce = useKingdom((s) => s.cameraNonce), autoRotate = useKingdom((s) => s.autoRotate), reducedMotion = useKingdom((s) => s.reducedMotion);
  const postX = useMemo(() => { if (!rig) return -1.2; const size = new Box3().setFromObject(rig.group).getSize(new Vector3()); return -(size.x / 2) - 0.45; }, [rig]);
  return (
    <CanvasBoundary onError={onError}>
      <Canvas dpr={[1, 2]} shadows camera={{fov: 30, near: 0.1, far: 120, position: [3, 2.2, 4.5]}} gl={{antialias: true, powerPreference: 'high-performance'}}
        onCreated={({gl}: {gl: WebGLRenderer}) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onError('The graphics context was lost. Reload the page to restore the 3D view.'); }); }}>
        <color attach="background" args={[ENV[env].bg]} />
        <Renderer env={env} shadows={shadows} />
        <Lights env={env} shadows={shadows} />
        <Ground env={env} />
        {rig ? <RigView rig={rig} anim={anim} motion={reducedMotion ? 0.35 : 1} /> : null}
        {scaleRef ? <ScalePost x={postX} /> : null}
        <CameraRig rig={rig} preset={preset} nonce={nonce} autoRotate={autoRotate} reducedMotion={reducedMotion} />
      </Canvas>
    </CanvasBoundary>
  );
}
