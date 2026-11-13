/**
 * The real game: a squad's workouts against a kaiju. Nothing here is played with keys. The quest page (or a demo) calls
 * `strike(memberId, damage, reps)` when someone logs a move in real life, and that member's hero runs up and lands one
 * swing per rep while the health bar drops. Between hits the kaiju stomps and roars for show; it never changes a score.
 */
import {Box3, Group, Vector3} from 'three';
import type {Cast} from '../cast';
import {C} from '../palette';
import {setState} from '../rig';
import {PX, box, softMaterial} from '../factories/soft';
import type {AnimState, Rig} from '../types';
import {SKY, Stage, type Host} from './stage';

export type Fighter = {id: number; name: string; cast: Cast};
export type BossFightOpts = {boss: Cast; name: string; hp: number; hpLeft: number; fighters: Fighter[]};
export type BossFight = {
  group: Group; background: number;
  /** A member's logged move lands: one swing per rep (twelve are shown at most), `damage` in total. */
  strike: (memberId: number, damage: number, reps?: number, critical?: boolean) => void;
  /** Health as the server knows it. The bar follows it once the queued strikes have landed; zero starts the defeat. */
  setHp: (hpLeft: number) => void;
  step: (dt: number, motion?: number) => void;
  dispose: () => void;
};
type Slot = {id: number; rig: Rig; home: Vector3};
type Strike = {slot: Slot; damage: number; reps: number; swings: number; critical: boolean; phase: 'run' | 'hit' | 'back'; t: number; landed: number};

const MAX_SQUAD = 6, MAX_SWINGS = 12, YAW = 0.55, RUN = 0.34, GAP = 1.6; // metres between squad members
const BLOOD: Record<string, number> = {'creature-slime': C.slime, 'creature-goblin': C.goblin, 'creature-cyclops': C.cyclops, 'creature-giant': C.giant, 'creature-baby-dragon': C.dragonBaby, 'creature-elder-dragon': C.dragonElder};
const ease = (k: number): number => k * k * (3 - 2 * k);

export function createBossFight(host: Host, o: BossFightOpts): BossFight {
  const st = new Stage(host, {fov: 30, sun: [-5, 11, 8], radius: 15, far: -13});
  st.ground(70, 40); st.block(22, 0.125, 9, 'rock', C.stoneLight, 0.5, -0.05, 0.4); // the plaza the fight happens on
  // the kingdom the squad defends on the left, the wild on the right
  st.place(st.make('world-castle-starter'), -12.5, 0, -6, 0.45).group.scale.setScalar(1.5);
  for (const [x, z] of [[-8, -3.6], [-4.6, -3.9]]) st.place(st.make('world-banner', {seed: x}), x, 0, z);
  const pine = st.make('world-tree-pine'), rock = st.make('world-rock');
  for (const [x, z] of [[6.5, -5.5], [10.5, -4.4], [14, -6.5], [17, -4.8]]) st.clone(pine, x, 0, z, x).group.scale.setScalar(1.5);
  for (const [x, z] of [[9, -2.8], [13.5, -3.2]]) st.clone(rock, x, 0, z, x).group.scale.setScalar(1.4);

  const boss = st.make(o.boss.assetId, o.boss.options), size = new Box3().setFromObject(boss.group), bw = size.max.x - size.min.x, bh = size.max.y, bossX = 1.4 + bw / 2;
  const squad: Slot[] = o.fighters.slice(0, MAX_SQUAD).map((f, i) => {
    const home = new Vector3(-1.9 - i * GAP, 0, i % 2 ? 1.3 : -0.7), rig = st.place(st.make(f.cast.assetId, f.cast.options), home.x, 0, home.z, Math.PI / 2 - YAW);
    st.text(f.name.split(' ')[0], 0, 2.2, 0, {size: 0.34, parent: rig.group}); return {id: f.id, rig, home};
  });
  const bar = new Group(); bar.position.set(bossX, bh + 0.75, 0); st.group.add(bar);
  box(bar, softMaterial('flat', C.ink), 50, 5, 1, 0, 0, 0, false); const fill = box(bar, softMaterial('flat', C.crimson), 48, 3, 1.6, 0, 0, 0, false);
  const title = st.text(o.name, bossX, bh + 1.35, 0, {size: 0.46});
  const spot = new Vector3(bossX - bw / 2 - 0.8, 0, 0.35), queue: Strike[] = [], rnd = Math.random;
  let hpShown = Math.max(0, o.hpLeft), hpTarget = hpShown, cur: Strike | null = null, down = false, taunt = 3, tauntHit = -1, party = 0, confetti = 0, chestIn = -1, zoom = 0;

  const restart = (rig: Rig, state: AnimState): void => { rig.state = rig.rest; setState(rig, state); };
  const trophy = (): void => { const c = st.place(st.make('world-chest'), bossX, 0, 0.2, -YAW); c.group.scale.setScalar(2.2); c.rest = 'celebrate'; setState(c, 'celebrate'); st.pulse(c.group, 0.3); st.burst(bossX, 1.2, 0.4, C.gold, 24, 3); };
  const defeat = (): void => { down = true; party = 5; chestIn = 0.7; bar.visible = false; if (title) title.visible = false; st.kill(boss, BLOOD[o.boss.assetId] ?? C.stone); st.shake(0.8); };
  if (hpShown <= 0) { down = true; bar.visible = false; if (title) title.visible = false; trophy(); } else st.place(boss, bossX, 0, 0, -Math.PI / 2 + YAW);

  /** One rep lands: sparks, a number, a notch off the bar. The last one of a set makes the kaiju flinch. */
  const land = (s: Strike): void => {
    const last = s.landed === s.swings - 1, each = Math.floor(s.damage / s.swings), chunk = last ? s.damage - each * (s.swings - 1) : each;
    const hx = bossX - bw * 0.32, hy = bh * (0.3 + rnd() * 0.35), tint = s.critical ? C.gold : C.sparkle;
    restart(s.slot.rig, 'attack'); hpShown = Math.max(0, hpShown - chunk);
    st.burst(hx, hy, 0.7, tint, last ? 18 : 7, last ? 3.2 : 2.2); st.pulse(boss.group, last ? 0.08 : 0.035); st.shake(last ? (s.critical ? 0.55 : 0.32) : 0.1);
    if (last) {
      restart(boss, 'hit'); st.text(`-${s.damage}`, hx, bh * 0.62, 1.2, {color: s.critical ? '#ffd23f' : '#ffffff', size: 0.78, life: 1.1}); // the set's total, once
      if (s.critical) st.text('CRITICAL', bossX, bh + 2, 1.2, {color: '#ffd23f', size: 0.7, life: 1.3});
      if (s.reps > 1) st.text(`${s.reps} reps`, s.slot.home.x, 3, s.slot.home.z, {color: '#bfe3ff', size: 0.42, life: 1.5});
    }
    s.landed++;
  };

  return {
    group: st.group, background: SKY,
    strike: (memberId, damage, reps = 1, critical = false) => { if (down || !squad.length) return; const n = Math.max(1, Math.round(reps)); queue.push({slot: squad.find((x) => x.id === memberId) ?? squad[squad.length - 1], damage: Math.max(0, Math.round(damage)), reps: n, swings: Math.min(MAX_SWINGS, n), critical, phase: 'run', t: 0, landed: 0}); },
    setHp: (hpLeft) => { hpTarget = Math.max(0, hpLeft); },
    dispose: () => st.dispose(),
    step: (dt, motion = 1) => {
      if (!cur && queue.length && !down) { cur = queue.shift()!; setState(cur.slot.rig, 'run'); }
      if (cur) {
        const s = cur, rig = s.slot.rig; s.t += dt * (queue.length > 1 ? 1.7 : 1); // a backlog plays faster
        if (s.phase === 'run') { const k = Math.min(1, s.t / RUN); rig.group.position.lerpVectors(s.slot.home, spot, ease(k)); rig.group.position.y = Math.sin(k * Math.PI) * 0.3; if (k >= 1) { s.phase = 'hit'; s.t = 0; } }
        else if (s.phase === 'hit') { const gap = s.critical ? 0.26 : 0.2; while (s.landed < s.swings && s.t >= 0.08 + s.landed * gap) land(s); if (s.landed >= s.swings && s.t >= 0.08 + s.swings * gap + 0.12) { s.phase = 'back'; s.t = 0; setState(rig, 'run'); } }
        else { const k = Math.min(1, s.t / RUN); rig.group.position.lerpVectors(spot, s.slot.home, ease(k)); rig.group.position.y = Math.sin(k * Math.PI) * 0.3; if (k >= 1) { rig.group.position.copy(s.slot.home); setState(rig, 'idle'); cur = null; } }
      } else if (!queue.length) {
        hpShown += (hpTarget - hpShown) * (1 - Math.exp(-dt * 6)); // settle on the server's number
        if (!down && hpTarget <= 0) defeat();
      }
      if (!down && !cur) { // the kaiju fights back for show: a stomp or a roar, and the squad jumps
        taunt -= dt;
        if (taunt <= 0) { const moves = (['stomp', 'puff', 'attack', 'squash'] as AnimState[]).filter((m) => boss.states.includes(m)); if (moves.length) restart(boss, moves[Math.floor(rnd() * moves.length)]); taunt = 4 + rnd() * 3; tauntHit = 0.45; }
      }
      if (tauntHit >= 0) { tauntHit -= dt; if (tauntHit < 0 && !down) { st.shake(0.38); st.burst(bossX - bw / 2 - 0.2, 0.3, 0.6, C.sand, 12, 2.2); for (const x of squad) if (x !== cur?.slot && x.rig.state === x.rig.rest) setState(x.rig, 'jump'); } }
      if (down) {
        for (const x of squad) if (x.rig.state === x.rig.rest) setState(x.rig, 'celebrate'); // victory loop
        if (chestIn >= 0) { chestIn -= dt; if (chestIn < 0) trophy(); }
        if (party > 0) { party -= dt; confetti -= dt; if (confetti <= 0) { confetti = 0.45; st.burst(-6 + rnd() * 12, 3 + rnd() * 1.5, 0.5, [C.gold, C.crimson, C.blue, C.pink][Math.floor(rnd() * 4)], 14, 3.2); } }
      }
      const k = Math.max(0, Math.min(1, hpShown / Math.max(1, o.hp))); fill.scale.x = Math.max(0.001, k); fill.position.x = -(1 - k) * 24 * PX;
      // frame the whole fight whatever the canvas shape, and lean in while someone is striking
      const left = -1.9 - Math.max(0, squad.length - 1) * GAP - 1, right = bossX + bw / 2 + 0.8, w = right - left, h = Math.max(bh + 2.4, 4.2), tan = Math.tan((host.camera.fov * Math.PI) / 360);
      const d = Math.max((h * 0.5) / tan, (w * 0.5) / (tan * Math.max(0.4, host.camera.aspect))) * 1.06 + 2, cx = (left + right) / 2;
      zoom += ((cur ? 1 : 0) - zoom) * (1 - Math.exp(-dt * 4));
      st.eye.set(cx + zoom * (spot.x - cx) * 0.25, h * 0.5 + d * 0.13, d * (1 - 0.12 * zoom)); st.look.set(cx + zoom * (spot.x - cx) * 0.25, h * 0.42, 0);
      st.update(dt, motion);
    },
  };
}
