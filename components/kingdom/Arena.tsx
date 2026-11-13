'use client';
/**
 * The Rally boss fight as a live scene: the quest's boss on the right, the squad's heroes on the left, all catalog
 * characters. The canvas is transparent so the page's arena backdrop shows through.
 */
import {Component, useEffect, useMemo, type ReactNode} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {ACESFilmicToneMapping, Box3, Group, Mesh, MeshBasicMaterial, PCFSoftShadowMap, PlaneGeometry, type PerspectiveCamera, SRGBColorSpace, Vector3} from 'three';
import {assetById} from '@/lib/kingdom/catalog';
import type {Cast} from '@/lib/kingdom/cast';
import {C} from '@/lib/kingdom/palette';
import {animate, setState} from '@/lib/kingdom/rig';
import type {Rig} from '@/lib/kingdom/types';
import {Lights} from './Preview';

export type ArenaHero = {id: number; cast: Cast};
export type ArenaProps = {boss: Cast; heroes: ArenaHero[]; attackerId?: number | null; /** Boss health left, 0..1: drawn as a red bar under the boss. */ hp?: number; hurt?: boolean; down?: boolean; reducedMotion?: boolean; onError?: () => void};

const build = (c: Cast): Rig => { const def = assetById(c.assetId); if (!def) throw new Error(`Unknown asset ${c.assetId}`); return def.build(c.options); };
const play = (rig: Rig, state: Rig['state']) => { if (rig.states.includes(state)) setState(rig, state); };

function Fight({boss, heroes, attackerId, hp = 1, hurt, down, reducedMotion}: ArenaProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera, size = useThree((s) => s.size), gl = useThree((s) => s.gl);
  useEffect(() => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace; gl.shadowMap.type = PCFSoftShadowMap; }, [gl]);
  const heroKey = heroes.map((h) => `${h.id}:${h.cast.assetId}:${JSON.stringify(h.cast.options)}`).join(',');
  const scene = useMemo(() => {
    const root = new Group(), bossRig = build(boss);
    const bossBox = new Box3().setFromObject(bossRig.group), bossW = bossBox.max.x - bossBox.min.x;
    bossRig.group.position.set(bossW / 2 + 0.5, 0, 0); bossRig.group.rotation.y = -0.75; root.add(bossRig.group);
    // Health bar under the boss: a track and a red fill that shrinks towards the left.
    const barW = Math.max(bossW, 1.4), barGeo = new PlaneGeometry(1, 1), bar = new Group();
    const track = new Mesh(barGeo, new MeshBasicMaterial({color: C.ironDark, toneMapped: false})); track.scale.set(barW + 0.08, 0.2, 1);
    const fill = new Mesh(barGeo.clone().translate(0.5, 0, 0), new MeshBasicMaterial({color: C.crimson, toneMapped: false})); fill.position.set(-barW / 2, 0, 0.01); fill.scale.set(barW, 0.12, 1);
    bar.add(track, fill); bar.position.set(bossRig.group.position.x, -0.3, bossBox.max.z + 0.2); root.add(bar);
    const squad = heroes.slice(0, 6).map((h, i) => {
      const rig = build(h.cast), row = i % 2;
      const home = new Vector3(-1.0 - i * 1.0, 0, row ? 0.75 : -0.55);
      rig.group.position.copy(home); rig.group.rotation.y = 1.0; root.add(rig.group);
      return {id: h.id, rig, home};
    });
    return {root, bossRig, squad, fill, barW, dispose: () => { bossRig.dispose(); barGeo.dispose(); fill.geometry.dispose(); track.material.dispose(); fill.material.dispose(); for (const s of squad) s.rig.dispose(); }};
  }, [boss.assetId, heroKey]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the cast, not object identity
  useEffect(() => () => scene.dispose(), [scene]);

  // Frame the whole fight, whatever the canvas shape.
  useEffect(() => {
    scene.root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene.root), dim = box.getSize(new Vector3()), mid = box.getCenter(new Vector3());
    const tan = Math.tan((camera.fov * Math.PI) / 360), aspect = size.width / Math.max(size.height, 1);
    const d = Math.max((dim.y * 0.56) / tan, (dim.x * 0.56) / (tan * aspect)) + dim.z * 0.5;
    camera.position.set(mid.x, mid.y + d * 0.16, mid.z + d); camera.lookAt(mid.x, mid.y * 0.95, mid.z); camera.updateProjectionMatrix();
  }, [scene, camera, size.width, size.height]);

  useEffect(() => { if (hurt && !down) play(scene.bossRig, 'hit'); }, [hurt, down, scene]);
  useEffect(() => { const a = scene.squad.find((s) => s.id === attackerId); if (a) play(a.rig, 'attack'); }, [attackerId, scene]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05), motion = reducedMotion ? 0.35 : 1, k = 1 - Math.exp(-dt * 8);
    const b = scene.bossRig.group;
    b.rotation.z += ((down ? -1.15 : 0) - b.rotation.z) * k; b.position.y += ((down ? 0.45 : 0) - b.position.y) * k;
    if (!down) animate(scene.bossRig, dt, motion);
    const want = Math.max(0, Math.min(1, down ? 0 : hp)) * scene.barW;
    scene.fill.scale.x += (want - scene.fill.scale.x) * k; scene.fill.visible = scene.fill.scale.x > 0.005;
    for (const s of scene.squad) {
      if (down && s.rig.state === s.rig.rest) play(s.rig, 'celebrate'); // victory loop
      const lunge = s.rig.state === 'attack' ? 0.7 : 0;
      s.rig.group.position.x += (s.home.x + lunge - s.rig.group.position.x) * k;
      animate(s.rig, dt, motion);
    }
  });
  return (
    <>
      <Lights env="meadow" shadows="low" radius={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[30, 40]} /><shadowMaterial opacity={0.2} /></mesh>
      <primitive object={scene.root} />
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
      <Canvas dpr={[1, 2]} shadows camera={{fov: 26, near: 0.1, far: 120, position: [0, 2, 9]}} gl={{antialias: true, alpha: true}}
        onCreated={({gl}) => { gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); props.onError?.(); }); }}>
        <Fight {...props} />
      </Canvas>
    </Boundary>
  );
}
