/** Castle Defense: three lanes, five waves, one gate. Enemy stats come from the shared difficulty table. */
import {DIFFICULTY} from '../difficulty.ts';
import type {CreatureKind, Variant} from '../types';
import {type GameEvent, type Input, NO_INPUT, type Phase, clamp, edges, makeRandom} from './common.ts';

export const DEFENSE = {laneX: [-2.3, 0, 2.3], spawnZ: 17, gateZ: 0.9, playerZ: 2.8, reach: 2.6, playerDamage: 4, swingCd: 0.5, spawnEvery: 1.5, waveGap: 2.5, gateHp: 12, enemyAttackEvery: 1.4, speedScale: 1.15} as const;
export type Lane = 0 | 1 | 2;
export type Enemy = {id: number; kind: CreatureKind; variant: Variant; lane: Lane; z: number; hp: number; maxHp: number; speed: number; damage: number; reward: number; state: 'walk' | 'attack' | 'dead'; attackCd: number; hitT: number; deadT: number};
export type DefenseState = {
  phase: Phase; t: number; lane: Lane; attackCd: number; swing: number; enemies: Enemy[]; gateHp: number; wave: number; queue: {kind: CreatureKind; variant: Variant}[];
  spawnT: number; waveGapT: number; kills: number; score: number; message: string; events: GameEvent[]; prev: Input; random: () => number; nextId: number;
};
export const WAVES: {kind: CreatureKind; variant: Variant}[][] = [
  [{kind: 'slime', variant: 'small'}, {kind: 'slime', variant: 'small'}, {kind: 'slime', variant: 'small'}, {kind: 'slime', variant: 'medium'}],
  [{kind: 'slime', variant: 'medium'}, {kind: 'goblin', variant: 'small'}, {kind: 'slime', variant: 'medium'}, {kind: 'goblin', variant: 'small'}, {kind: 'goblin', variant: 'medium'}],
  [{kind: 'goblin', variant: 'medium'}, {kind: 'goblin', variant: 'medium'}, {kind: 'cyclops', variant: 'small'}, {kind: 'goblin', variant: 'medium'}, {kind: 'cyclops', variant: 'medium'}],
  [{kind: 'cyclops', variant: 'medium'}, {kind: 'goblin', variant: 'medium'}, {kind: 'giant', variant: 'small'}, {kind: 'cyclops', variant: 'medium'}, {kind: 'goblin', variant: 'boss'}],
  [{kind: 'giant', variant: 'medium'}, {kind: 'babyDragon', variant: 'medium'}, {kind: 'giant', variant: 'medium'}, {kind: 'elderDragon', variant: 'boss'}],
];

export function createDefense(seed = 1): DefenseState {
  return {phase: 'intro', t: 0, lane: 1, attackCd: 0, swing: 0, enemies: [], gateHp: DEFENSE.gateHp, wave: 0, queue: [], spawnT: 0, waveGapT: 0, kills: 0, score: 0, message: '', events: [], prev: {...NO_INPUT}, random: makeRandom(seed), nextId: 1};
}
function startWave(s: DefenseState): void { s.wave += 1; s.queue = [...WAVES[s.wave - 1]]; s.spawnT = 0.6; s.message = `Wave ${s.wave} of ${WAVES.length}`; s.events.push({type: 'wave', value: s.wave}); }
export function startDefense(s: DefenseState): DefenseState { s.phase = 'playing'; s.wave = 0; s.enemies = []; s.gateHp = DEFENSE.gateHp; s.kills = 0; s.score = 0; s.lane = 1; startWave(s); return s; }

export function stepDefense(s: DefenseState, input: Input, dt: number): DefenseState {
  s.events = [];
  if (s.phase !== 'playing') return s;
  const e = edges(s.prev, input); s.prev = {...input};
  s.t += dt; s.attackCd = Math.max(0, s.attackCd - dt); s.swing = Math.max(0, s.swing - dt);
  if (e.left) s.lane = clamp(s.lane - 1, 0, 2) as Lane;
  if (e.right) s.lane = clamp(s.lane + 1, 0, 2) as Lane;
  if (e.action && s.attackCd <= 0) {
    s.attackCd = DEFENSE.swingCd; s.swing = 0.4; s.events.push({type: 'swing'});
    const target = s.enemies.filter((en) => en.state !== 'dead' && en.lane === s.lane && en.z <= DEFENSE.playerZ + DEFENSE.reach).sort((a, b) => a.z - b.z)[0];
    if (target) {
      target.hp -= DEFENSE.playerDamage; target.hitT = 0.3; s.events.push({type: 'hit', x: DEFENSE.laneX[target.lane], z: target.z});
      if (target.hp <= 0) { target.state = 'dead'; target.deadT = 0.6; s.kills += 1; s.score += target.reward; s.events.push({type: 'puff', x: DEFENSE.laneX[target.lane], z: target.z}, {type: 'score', value: target.reward}); }
    }
  }
  if (s.queue.length) { s.spawnT -= dt; if (s.spawnT <= 0) { const q = s.queue.shift()!, d = DIFFICULTY[q.kind][q.variant], lane = Math.floor(s.random() * 3) as Lane; s.enemies.push({id: s.nextId++, kind: q.kind, variant: q.variant, lane, z: DEFENSE.spawnZ, hp: d.hp, maxHp: d.hp, speed: d.speed * DEFENSE.speedScale, damage: d.damage, reward: d.reward, state: 'walk', attackCd: 0.8, hitT: 0, deadT: 0}); s.spawnT = DEFENSE.spawnEvery; } }
  for (const en of s.enemies) {
    en.hitT = Math.max(0, en.hitT - dt);
    if (en.state === 'dead') { en.deadT -= dt; continue; }
    if (en.z > DEFENSE.gateZ) { en.z = Math.max(DEFENSE.gateZ, en.z - en.speed * dt); if (en.z <= DEFENSE.gateZ) en.state = 'attack'; }
    else { en.attackCd -= dt; if (en.attackCd <= 0) { en.attackCd = DEFENSE.enemyAttackEvery; s.gateHp -= en.damage; s.events.push({type: 'stomp', x: DEFENSE.laneX[en.lane], z: 0, value: en.damage}); } }
  }
  s.enemies = s.enemies.filter((en) => en.state !== 'dead' || en.deadT > 0);
  if (s.gateHp <= 0) { s.gateHp = 0; s.phase = 'lost'; s.message = 'The gate has fallen.'; s.events.push({type: 'lose'}); return s; }
  if (!s.queue.length && !s.enemies.some((en) => en.state !== 'dead')) {
    s.waveGapT += dt;
    if (s.waveGapT >= DEFENSE.waveGap) {
      s.waveGapT = 0;
      if (s.wave >= WAVES.length) { s.phase = 'won'; s.score += s.gateHp * 10; s.message = 'The kingdom stands!'; s.events.push({type: 'win'}); }
      else startWave(s);
    }
  } else s.waveGapT = 0;
  return s;
}
