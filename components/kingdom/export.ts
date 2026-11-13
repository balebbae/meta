/**
 * GLB export with a re-import check. Exports the rig's current pose as static geometry: merged voxel meshes,
 * vertex colours and the nearest-filtered pixel textures. Procedural animations are not exported (there are no
 * keyframe tracks; pivots move in code), so the GLB is a posed model, not an animated one.
 */
import type {Object3D} from 'three';
import type {Rig} from '@/lib/kingdom/types';

export type ExportReport = {ok: boolean; bytes: number; meshes: number; verifiedMeshes: number; note: string};

const countMeshes = (root: Object3D): number => { let n = 0; root.traverse((o) => { if ((o as {isMesh?: boolean}).isMesh) n++; }); return n; };

export async function exportGLB(rig: Rig, fileName: string): Promise<ExportReport> {
  const [{GLTFExporter}, {GLTFLoader}] = await Promise.all([import('three/examples/jsm/exporters/GLTFExporter.js'), import('three/examples/jsm/loaders/GLTFLoader.js')]);
  const data = await new GLTFExporter().parseAsync(rig.group, {binary: true, onlyVisible: true});
  if (!(data instanceof ArrayBuffer)) throw new Error('Exporter did not return a binary GLB');
  const meshes = countMeshes(rig.group);
  const reimport = await new GLTFLoader().parseAsync(data.slice(0), '');
  const verifiedMeshes = countMeshes(reimport.scene);
  const ok = verifiedMeshes === meshes && verifiedMeshes > 0;
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([data], {type: 'model/gltf-binary'}));
    const a = document.createElement('a'); a.href = url; a.download = `${fileName}.glb`; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return {ok, bytes: data.byteLength, meshes, verifiedMeshes, note: ok ? 'Re-import matched every mesh. Pose is baked; procedural animations are not exported.' : `Re-import found ${verifiedMeshes} of ${meshes} meshes.`};
}
