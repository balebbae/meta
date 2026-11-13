'use client';
/**
 * Character portraits for 2D surfaces (lists, chat cards, squad rows). One shared offscreen WebGL context renders a
 * catalog character once into a transparent PNG; every later use is a cached <img>, so a page full of characters
 * costs one context instead of one per character.
 */
import {useEffect, useState} from 'react';
import {ACESFilmicToneMapping, Box3, DirectionalLight, HemisphereLight, PerspectiveCamera, SRGBColorSpace, Scene, Vector3, WebGLRenderer} from 'three';
import {assetById} from '@/lib/kingdom/catalog';
import {castKey, type Cast} from '@/lib/kingdom/cast';
import {animate, setState} from '@/lib/kingdom/rig';
import type {AnimState} from '@/lib/kingdom/types';

const PX = 320; // portrait resolution; sharp up to 160 css px on a 2x screen
const cache = new Map<string, string>();
let stage: {gl: WebGLRenderer; scene: Scene; camera: PerspectiveCamera} | null = null;

function getStage() {
  if (stage) return stage;
  const gl = new WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
  gl.setSize(PX, PX, false); gl.setClearColor(0x000000, 0);
  gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  scene.add(new HemisphereLight('#fff4ea', '#d8c7b5', 1.1));
  const key = new DirectionalLight('#fff1dc', 2.4); key.position.set(-4, 8, 5); scene.add(key);
  const rim = new DirectionalLight('#bfd3ff', 0.9); rim.position.set(5, 5, -5); scene.add(rim);
  const fill = new DirectionalLight('#ffe6f0', 0.5); fill.position.set(5, 2, 6); scene.add(fill);
  stage = {gl, scene, camera: new PerspectiveCamera(24, 1, 0.1, 100)};
  return stage;
}

/** Render a character to a PNG data URL. Throws when WebGL is unavailable. */
export function renderSprite(cast: Cast, pose: AnimState = 'idle'): string {
  const k = castKey(cast, pose);
  const hit = cache.get(k); if (hit) return hit;
  const def = assetById(cast.assetId); if (!def) throw new Error(`Unknown asset ${cast.assetId}`);
  const {gl, scene, camera} = getStage();
  const rig = def.build(cast.options);
  try {
    if (pose !== 'idle' && rig.states.includes(pose)) setState(rig, pose);
    for (let i = 0; i < 18; i++) animate(rig, 1 / 60); // settle into the pose
    rig.group.rotation.y = 0.32;
    scene.add(rig.group); rig.group.updateMatrixWorld(true);
    const box = new Box3().setFromObject(rig.group), size = box.getSize(new Vector3()), mid = box.getCenter(new Vector3());
    const half = Math.max(size.y, size.x) * 0.5 * 1.08, d = half / Math.tan((camera.fov * Math.PI) / 360) + size.z * 0.5;
    camera.position.set(mid.x, mid.y + half * 0.25, mid.z + d); camera.lookAt(mid); camera.updateProjectionMatrix();
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL('image/png');
    cache.set(k, url);
    return url;
  } finally { rig.group.removeFromParent(); rig.dispose(); }
}

/** The portrait URL once it is rendered; null while pending, 'error' when this device cannot draw it. */
export function useSprite(cast: Cast, pose: AnimState = 'idle'): string | null {
  const k = castKey(cast, pose);
  const [url, setUrl] = useState<string | null>(() => cache.get(k) ?? null);
  useEffect(() => {
    const cached = cache.get(k); if (cached) { setUrl(cached); return; }
    setUrl(null);
    // Rendering is synchronous; yield a frame first so a list of characters does not block first paint.
    const id = requestAnimationFrame(() => { try { setUrl(renderSprite(cast, pose)); } catch { setUrl('error'); } });
    return () => cancelAnimationFrame(id);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps -- k is the cast's identity
  return url;
}
