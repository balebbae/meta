/**
 * The other real game: running claims land. The arena is an island of hex tiles, one per map cell. A kingdom's tiles rise
 * in its colour, its keep grows with its land and its hero stands beside it. When someone closes a loop in real life the
 * page calls `setOwners` with the new owners and the claimed tiles ripple up. Your own open trail (and only yours) glows,
 * with your hero running at its head. Nothing here is played with keys.
 */
import {Color, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Vector3} from 'three';
import type {Cast} from '../cast';
import {C} from '../palette';
import {setContinuous, setState} from '../rig';
import {softMaterial} from '../factories/soft';
import {buildTent, tower} from '../factories/world';
import type {Rig} from '../types';
import {SKY, Stage, type Host} from './stage';

export type Kingdom = {id: number; name: string; color: number; cast: Cast};
/** Every cell of the arena, in any flat units (metres east and south of the centre work): the scene scales them to one tile each. */
export type TerritoryOpts = {cells: {key: string; x: number; z: number}[]; kingdoms: Kingdom[]; owners: [string, number][]; viewerId?: number | null};
export type Territory = {
  group: Group; background: number;
  /** The server's [cell, owner] pairs. Changes since the last call ripple up in the new owner's colour. */
  setOwners: (owners: [string, number][]) => void;
  /** The viewer's own open trail, oldest cell first. Never anyone else's. */
  setTrail: (keys: string[]) => void;
  step: (dt: number, motion?: number) => void;
  dispose: () => void;
};
type Realm = {k: Kingdom; hero: Rig; keep: Group; tent: Rig; camp: Vector3; home: Vector3; cells: number};
type Pop = {i: number; at: number; to: number; begun: boolean};

const WILD = 0.18, OWNED = 0.44, TRAIL_MAX = 600, MEADOW = 0xc6d8b0; // unclaimed land is pale so every kingdom colour, green included, stands out

export function createTerritory(host: Host, o: TerritoryOpts): Territory {
  // one tile per cell: scale so neighbours sit one metre apart, and turn the hexes so their flats face each other
  const first = o.cells[0] ?? {x: 0, z: 0, key: ''}; let near = Infinity, turn = 0;
  for (const c of o.cells) { const d = Math.hypot(c.x - first.x, c.z - first.z); if (d > 0 && d < near) { near = d; turn = Math.atan2(c.x - first.x, c.z - first.z); } }
  const unit = Number.isFinite(near) ? near : 1, n = o.cells.length, px = new Float32Array(n), pz = new Float32Array(n), index = new Map<string, number>();
  let R = 4; o.cells.forEach((c, i) => { px[i] = c.x / unit; pz[i] = c.z / unit; index.set(c.key, i); R = Math.max(R, Math.hypot(px[i], pz[i]) + 1); });
  const S = Math.max(1.4, R / 9); // heroes and keeps are pawns on a board: sized to the board, not to the tiles

  const st = new Stage(host, {fov: 40, sun: [-R * 0.9, R * 1.7, R * 0.8], radius: R + 4});
  st.block(R * 8, 1, R * 8, 'water', C.water, 0, -0.95, 0);
  const shore = new CylinderGeometry(R + 0.7, R + 1.5, 0.45, 40), island = new Mesh(shore, softMaterial('sand', C.sand)); island.position.y = -0.225; island.receiveShadow = true; st.group.add(island);
  const hex = new CylinderGeometry(0.545, 0.545, 1, 6).translate(0, 0.5, 0).rotateY(turn + Math.PI / 6);
  const tiles = new InstancedMesh(hex, [softMaterial('rock', 0xc4c4c4), softMaterial('grass', 0xffffff), softMaterial('rock', 0xc4c4c4)], Math.max(1, n)); tiles.receiveShadow = true; tiles.count = n; st.group.add(tiles);
  const glow = new MeshBasicMaterial({color: C.sparkle, transparent: true, opacity: 0.9}), trailMesh = new InstancedMesh(new CylinderGeometry(0.3, 0.3, 0.1, 6).rotateY(turn + Math.PI / 6), glow, TRAIL_MAX); trailMesh.count = 0; st.group.add(trailMesh);
  const dummy = new Object3D(), tint = new Color(), owner = new Int32Array(n).fill(-1), height = new Float32Array(n).fill(WILD), pops: Pop[] = [];
  const paint = (i: number): void => { const k = owner[i] >= 0 ? realms.get(owner[i]) : undefined; tiles.setColorAt(i, tint.setHex(k ? k.k.color : MEADOW)); };
  const raise = (i: number, h: number): void => { height[i] = h; dummy.position.set(px[i], 0, pz[i]); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, h, 1); dummy.updateMatrix(); tiles.setMatrixAt(i, dummy.matrix); };

  // every kingdom starts as a tent on the shore; once it owns land its keep rises there and its hero moves in
  const realms = new Map<number, Realm>();
  o.kingdoms.forEach((k, j) => {
    const a = (j / Math.max(1, o.kingdoms.length)) * Math.PI * 2 + 0.6, camp = new Vector3(Math.sin(a) * (R + 0.2), 0, Math.cos(a) * (R + 0.2));
    const tent = st.place(buildTent(k.color), camp.x, 0, camp.z, a), keep = new Group(); tent.group.scale.setScalar(S * 0.8); keep.visible = false; st.group.add(keep);
    tower(keep, 0, 0, 14, 10, softMaterial('stone', C.stoneLight), softMaterial('cloth', k.color), softMaterial('gold', C.gold), k.color);
    const hero = st.place(st.make(k.cast.assetId, k.cast.options), camp.x, 0, camp.z, a + Math.PI); hero.group.scale.setScalar(S);
    st.text(k.name.split(' ')[0], 0, 2.35, 0, {size: 0.5, parent: hero.group});
    realms.set(k.id, {k, hero, keep, tent, camp, home: camp.clone(), cells: 0});
  });
  const viewer = o.viewerId != null ? realms.get(o.viewerId) : undefined;
  let trail: number[] = [], clock = 0, dirty = true;

  /** Count each kingdom's land and seat its keep on the tile nearest the middle of it. */
  const settle = (): void => {
    const sum = new Map<number, [number, number, number]>();
    for (let i = 0; i < n; i++) if (owner[i] >= 0) { const s = sum.get(owner[i]) ?? [0, 0, 0]; s[0] += px[i]; s[1] += pz[i]; s[2]++; sum.set(owner[i], s); }
    for (const r of realms.values()) {
      const s = sum.get(r.k.id); r.cells = s?.[2] ?? 0; r.keep.visible = r.cells > 0; r.tent.group.visible = r.cells === 0;
      if (!s) { r.home.copy(r.camp); continue; }
      let best = -1, bd = Infinity; const cx = s[0] / s[2], cz = s[1] / s[2];
      for (let i = 0; i < n; i++) if (owner[i] === r.k.id) { const d = (px[i] - cx) ** 2 + (pz[i] - cz) ** 2; if (d < bd) { bd = d; best = i; } }
      const grow = S * (0.75 + Math.min(1, r.cells / 160) * 0.85); r.keep.position.set(px[best], OWNED, pz[best]); r.keep.scale.setScalar(grow); r.home.set(px[best] + grow * 1.1, OWNED, pz[best] + grow * 0.7);
    }
  };
  const apply = (owners: [string, number][], instant: boolean): void => {
    const next = new Int32Array(n).fill(-1); for (const [key, who] of owners) { const i = index.get(key); if (i !== undefined && realms.has(who)) next[i] = who; }
    const changed: number[] = []; for (let i = 0; i < n; i++) if (next[i] !== owner[i]) changed.push(i);
    if (!changed.length) return;
    const gained = new Map<number, number>(), lost = new Map<number, number>();
    for (const i of changed) { if (next[i] >= 0) gained.set(next[i], (gained.get(next[i]) ?? 0) + 1); if (owner[i] >= 0) lost.set(owner[i], (lost.get(owner[i]) ?? 0) + 1); }
    if (instant) for (const i of changed) { owner[i] = next[i]; paint(i); raise(i, next[i] >= 0 ? OWNED : WILD); }
    else {
      // ripple outward from wherever the claimer stands
      const top = [...gained].sort((a, b) => b[1] - a[1])[0], from = top ? realms.get(top[0])!.hero.group.position : new Vector3();
      changed.sort((a, b) => Math.hypot(px[a] - from.x, pz[a] - from.z) - Math.hypot(px[b] - from.x, pz[b] - from.z));
      changed.forEach((i, j) => { owner[i] = next[i]; pops.push({i, at: clock + Math.min(j * 0.012, (1.4 * j) / changed.length), to: next[i] >= 0 ? OWNED : WILD, begun: false}); });
      for (const [id, count] of gained) { const r = realms.get(id)!; setState(r.hero, 'celebrate'); st.text(`+${count}`, r.hero.group.position.x, OWNED + S * 2.9, r.hero.group.position.z, {size: S * 0.9, life: 1.8}); }
      for (const [id, count] of lost) { const r = realms.get(id)!; if (!gained.has(id)) setState(r.hero, 'hit'); st.text(`-${count}`, r.keep.position.x, OWNED + S * 2.2, r.keep.position.z, {color: '#ffffff', size: S * 0.55, life: 1.6}); }
      st.shake(0.25);
    }
    settle(); dirty = true;
  };
  for (let i = 0; i < n; i++) { paint(i); raise(i, WILD); }
  apply(o.owners, true); settle();
  for (const r of realms.values()) r.hero.group.position.copy(r.home);

  return {
    group: st.group, background: SKY,
    setOwners: (owners) => apply(owners, false),
    setTrail: (keys) => { trail = keys.map((k) => index.get(k)).filter((i): i is number => i !== undefined).slice(-TRAIL_MAX); },
    dispose: () => { hex.dispose(); shore.dispose(); trailMesh.geometry.dispose(); glow.dispose(); st.dispose(); },
    step: (dt, motion = 1) => {
      clock += dt;
      for (let j = pops.length - 1; j >= 0; j--) { // a claimed tile takes its new colour, jumps and settles
        const p = pops[j], t = clock - p.at; if (t < 0) continue;
        if (!p.begun) { p.begun = true; paint(p.i); if (p.i % 7 === 0) st.burst(px[p.i], 0.7, pz[p.i], owner[p.i] >= 0 ? realms.get(owner[p.i])!.k.color : MEADOW, 3, 1.6, 1.2); }
        const k = Math.min(1, t / 0.4); raise(p.i, p.to + Math.sin(k * Math.PI) * 0.75); dirty = true; if (k >= 1) { raise(p.i, p.to); pops.splice(j, 1); }
      }
      if (dirty) { tiles.instanceMatrix.needsUpdate = true; if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true; dirty = false; }
      trailMesh.count = trail.length;
      trail.forEach((i, j) => { const beat = 1 + 0.25 * Math.sin(clock * 6 - j * 0.6); dummy.position.set(px[i], height[i] + 0.08, pz[i]); dummy.rotation.set(0, 0, 0); dummy.scale.set(beat, 1, beat); dummy.updateMatrix(); trailMesh.setMatrixAt(j, dummy.matrix); });
      if (trail.length) trailMesh.instanceMatrix.needsUpdate = true;
      for (const r of realms.values()) { // heroes walk home; the viewer's runs at the head of their trail
        const p = r.hero.group.position, running = r === viewer && trail.length > 0, goal = running ? dummy.position.set(px[trail[trail.length - 1]], height[trail[trail.length - 1]], pz[trail[trail.length - 1]]) : r.home;
        const gap = Math.hypot(goal.x - p.x, goal.z - p.z);
        if (gap > 0.05) { r.hero.group.rotation.y = Math.atan2(goal.x - p.x, goal.z - p.z); p.lerp(goal, 1 - Math.exp(-dt * (running ? 9 : 3))); }
        setContinuous(r.hero, running || gap > 0.4 ? 'run' : 'idle');
      }
      // a slow orbit that always holds the whole island
      const tan = Math.tan((host.camera.fov * Math.PI) / 360), d = (R * 1.12) / (tan * Math.min(1, host.camera.aspect)), a = 0.5 + Math.sin(clock * 0.12) * 0.3 * motion;
      st.eye.set(Math.sin(a) * d * 0.6, d * 0.68, Math.cos(a) * d * 0.6); st.look.set(0, 0, R * 0.08);
      st.update(dt, motion);
    },
  };
}
