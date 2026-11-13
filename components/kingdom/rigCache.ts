/**
 * Owns every Rig the UI builds. The gallery asks for (asset, options) and gets a cached Rig; the ten most recent stay
 * alive, older ones are disposed. Games clone cached rigs: clones share geometry, so disposing a clone is a no-op.
 */
import {disposeSoftResources} from '@/lib/kingdom/factories/soft';
import type {AssetDef, BuildOptions, Rig} from '@/lib/kingdom/types';

const MAX = 10;
const cache = new Map<string, Rig>();
export const rigKey = (def: AssetDef, options: BuildOptions): string => `${def.id}|${JSON.stringify(options)}`;

export function getRig(def: AssetDef, options: BuildOptions): Rig {
  const key = rigKey(def, options);
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const rig = def.build(options);
  cache.set(key, rig);
  while (cache.size > MAX) { const [oldKey, old] = cache.entries().next().value as [string, Rig]; cache.delete(oldKey); old.group.removeFromParent(); old.dispose(); }
  return rig;
}

export {cloneRig} from '@/lib/kingdom/rig';

export function releaseAllRigs(): void {
  for (const rig of cache.values()) { rig.group.removeFromParent(); rig.dispose(); }
  cache.clear();
  disposeSoftResources();
}
export const cachedRigCount = (): number => cache.size;
