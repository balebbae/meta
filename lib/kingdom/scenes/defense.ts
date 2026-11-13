/** Castle Defense: the gate at the camera's feet, three lanes running away, kaijus marching in. Every swing, hit, kill and blow on the gate has its own beat. */
import {Box3} from 'three';
import {C} from '../palette';
import {autoDefense} from '../games/autopilot';
import {DEFENSE, createDefense, startDefense, stepDefense} from '../games/defense';
import {setContinuous, setState} from '../rig';
import {PX, box, softMaterial} from '../factories/soft';
import type {CreatureKind, Rig, Variant} from '../types';
import {SKY, Stage, type GameScene, type Host} from './stage';

const KIND_ID: Record<CreatureKind, string> = {slime: 'creature-slime', goblin: 'creature-goblin', cyclops: 'creature-cyclops', giant: 'creature-giant', babyDragon: 'creature-baby-dragon', elderDragon: 'creature-elder-dragon'};
const BLOOD: Record<CreatureKind, number> = {slime: C.slime, goblin: C.goblin, cyclops: C.cyclops, giant: C.giant, babyDragon: C.dragonBaby, elderDragon: C.dragonElder};
type Foe = {rig: Rig; kind: CreatureKind; kick: number; dead: boolean; /** how close its centre may come to the gate before its body would cover the hero */ stop: number; bar: {scale: {x: number}; position: {x: number}} | null};
/** The hero is drawn just in front of the gate; the logic's playerZ only sets his reach. */
const HERO_Z = 1.4;

export function createDefenseScene(host: Host): GameScene {
  const st = new Stage(host, {fov: 46, sun: [-7, 13, -5], radius: 19, far: 24});
  let s = createDefense(1), gateKick = 0, fallen = false;
  st.ground(40, 46, 0, 9);
  for (const x of DEFENSE.laneX) st.block(1.5, 0.125, 18, 'rock', C.stoneLight, x, -0.05, 9.6);
  const gate = st.place(st.make('world-gate'), 0, 0, -0.2), wall = st.make('world-wall'), tower = st.make('world-tower'), tree = st.make('world-tree-round'), pine = st.make('world-tree-pine'), rock = st.make('world-rock');
  for (const sx of [-1, 1]) { for (let i = 0; i < 6; i++) st.clone(wall, sx * (1.375 + i), 0, -0.2); st.clone(tower, sx * 7.6, 0, -0.2); }
  for (let i = 0; i < 8; i++) { const sx = i % 2 ? 1 : -1; st.clone(i % 3 ? tree : pine, sx * (5.4 + (i % 3) * 0.9), 0, 2.5 + i * 2.2, i); }
  for (const [x, z] of [[-4.4, 6], [4.7, 11.5], [-5.2, 15]]) st.clone(rock, x, 0, z, x);
  const hero = st.place(st.make('hero-iron', {hero: host.hero}), 0, 0, HERO_Z), box3 = new Box3();
  const bases = new Map<string, Rig>(), foes = new Map<number, Foe>();
  const base = (kind: CreatureKind, variant: Variant): Rig => { const k = `${kind}:${variant}`; let b = bases.get(k); if (!b) { b = st.make(KIND_ID[kind], {variant}); bases.set(k, b); } return b; };
  const clear = (): void => { for (const f of foes.values()) st.drop(f.rig); foes.clear(); };

  return {
    group: st.group, background: SKY,
    start: (seed = 1) => { clear(); s = startDefense(createDefense(seed)); gateKick = 0; fallen = false; gate.group.rotation.x = 0; gate.group.position.y = 0; setState(hero, 'idle'); },
    auto: () => autoDefense(s),
    hud: () => ({phase: s.phase, score: s.score, message: s.message, left: `Wave ${Math.max(1, s.wave)} / 5 · Gate ♥ ${s.gateHp}`, right: `Kills ${s.kills}`}),
    dispose: () => st.dispose(),
    step: (dt, input) => {
      stepDefense(s, input, dt);
      const hx = hero.group.position.x;
      for (const e of s.events) {
        if (e.type === 'swing') { setState(hero, 'attack'); st.burst(hx, 1.2, HERO_Z + 1.4, C.white, 6, 1.3, 0.8); }
        if (e.type === 'hit') { // sparks, a flinch and a shove back
          const f = [...foes.values()].filter((v) => !v.dead && v.rig.group.position.x === e.x).sort((a, b) => a.rig.group.position.z - b.rig.group.position.z)[0];
          st.burst(e.x ?? 0, f ? f.rig.height * 0.55 : 1.2, (e.z ?? 0) - 0.9, C.sparkle, 12, 2.4); st.shake(0.22);
          if (f) { f.kick = 0.5; st.pulse(f.rig.group, 0.1); }
        }
        if (e.type === 'puff') st.shake(0.4);
        if (e.type === 'stomp') { // a kaiju hits the gate: rubble, a jolt, and the attacker's own swing
          st.burst(e.x ?? 0, 1, 0.4, C.stone, 14, 2.6, 1.3); st.shake(0.45); gateKick = 1;
          const en = s.enemies.find((n) => n.state === 'attack' && DEFENSE.laneX[n.lane] === e.x), f = en ? foes.get(en.id) : undefined;
          if (f) setState(f.rig, f.rig.states.includes('stomp') ? 'stomp' : 'attack');
        }
        if (e.type === 'wave' && e.value === 5) st.shake(0.5);
        if (e.type === 'win') { setState(hero, 'celebrate'); [-5, -2.5, 0, 2.5, 5].forEach((x, i) => st.burst(x, 2.2, 0.6, [C.gold, C.crimson, C.blue][i % 3], 16, 3.4)); }
        if (e.type === 'lose') { setState(hero, 'hit'); fallen = true; st.burst(0, 1, 0, C.stoneLight, 44, 4.2, 1.8); st.shake(0.9); }
      }
      hero.group.position.x += (DEFENSE.laneX[s.lane] - hx) * (1 - Math.exp(-dt * 14));
      const alive = new Set<number>();
      for (const en of s.enemies) {
        alive.add(en.id); let f = foes.get(en.id);
        if (!f) {
          const rig = st.clone(base(en.kind, en.variant), DEFENSE.laneX[en.lane], 0, en.z, Math.PI); setState(rig, rig.species === 'dragon' ? 'flap' : 'walk');
          let bar: Foe['bar'] = null; // anything that takes more than two swings shows its health
          if (en.maxHp > 8) { const y = rig.height / PX + 5; box(rig.group, softMaterial('flat', C.ink), 18, 4, 1, 0, y, 0, false); bar = box(rig.group, softMaterial('flat', C.crimson), 16, 2, 1.6, 0, y, 0, false); }
          f = {rig, kind: en.kind, kick: 0, dead: false, stop: HERO_Z + 0.7 + (box3.setFromObject(rig.group).max.z - box3.min.z) / 2, bar}; foes.set(en.id, f); if (en.variant === 'boss') st.shake(0.45);
        }
        if (en.state === 'dead') { if (!f.dead) { f.dead = true; st.kill(f.rig, BLOOD[f.kind]); } continue; }
        f.kick = Math.max(0, f.kick - dt * 2.2);
        f.rig.group.position.set(DEFENSE.laneX[en.lane], f.rig.species === 'dragon' ? 0.6 : 0, Math.max(en.z, f.stop) + f.kick);
        if (f.bar) { const k = Math.max(0, en.hp / en.maxHp); f.bar.scale.x = Math.max(0.001, k); f.bar.position.x = (1 - k) * 0.5; }
        if (en.state === 'walk') setContinuous(f.rig, f.rig.species === 'dragon' ? 'flap' : 'walk'); else if (f.rig.state === 'walk' || f.rig.state === 'flap') setState(f.rig, 'idle');
      }
      for (const [id, f] of foes) if (!alive.has(id)) { if (!f.dead) st.drop(f.rig); foes.delete(id); }
      gateKick = Math.max(0, gateKick - dt * 3); gate.group.position.x = Math.sin(s.t * 70) * gateKick * 0.07;
      if (fallen) { gate.group.rotation.x += (-1.35 - gate.group.rotation.x) * (1 - Math.exp(-dt * 4)); gate.group.position.y += (-0.3 - gate.group.position.y) * (1 - Math.exp(-dt * 4)); }
      st.eye.set(hero.group.position.x * 0.3, 7.4, -7.6); st.look.set(hero.group.position.x * 0.15, 2.2, 7); // low behind the hero, so the kaijus loom
      st.update(dt);
    },
  };
}
