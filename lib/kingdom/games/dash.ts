/** Dragon Dash: a flap-through-the-gaps run to the castle. World x is distance travelled; the dragon is always at x = dist. */
import {type GameEvent, type Input, NO_INPUT, type Phase, clamp, edges, makeRandom} from './common.ts';

export const DASH = {gravity: -17, flap: 6.4, speed: 4.6, ceil: 6.4, floor: 0.45, gap: 1.35, pillarW: 0.8, radius: 0.42, spacing: 4.4, goal: 120, lives: 3, firstPillar: 10} as const;
export type Pillar = {x: number; gapY: number; passed: boolean};
export type Coin = {x: number; y: number; taken: boolean};
export type DashState = {
  phase: Phase; t: number; dist: number; y: number; vy: number; lives: number; coins: number; score: number; invuln: number;
  pillars: Pillar[]; coinList: Coin[]; nextPillarX: number; message: string; events: GameEvent[]; prev: Input; random: () => number;
};

export function createDash(seed = 1): DashState {
  return {phase: 'intro', t: 0, dist: 0, y: 2.6, vy: 0, lives: DASH.lives, coins: 0, score: 0, invuln: 0, pillars: [], coinList: [], nextPillarX: DASH.firstPillar, message: '', events: [], prev: {...NO_INPUT}, random: makeRandom(seed)};
}
export function startDash(s: DashState): DashState {
  s.phase = 'playing'; s.dist = 0; s.y = 2.6; s.vy = 0; s.lives = DASH.lives; s.coins = 0; s.score = 0; s.invuln = 0; s.pillars = []; s.coinList = []; s.nextPillarX = DASH.firstPillar; s.message = 'Fly!';
  return s;
}
function spawn(s: DashState): void {
  const gapY = 1.5 + s.random() * 3.4;
  s.pillars.push({x: s.nextPillarX, gapY, passed: false});
  const cy = 1.2 + s.random() * 4.2;
  for (let i = 0; i < 3; i++) s.coinList.push({x: s.nextPillarX + DASH.spacing / 2 + (i - 1) * 0.6, y: cy, taken: false});
  s.nextPillarX += DASH.spacing;
}
export function stepDash(s: DashState, input: Input, dt: number): DashState {
  s.events = [];
  if (s.phase !== 'playing') return s;
  const e = edges(s.prev, input); s.prev = {...input};
  s.t += dt;
  if (e.jump || e.action || e.up) { s.vy = DASH.flap; s.events.push({type: 'flap'}); }
  s.vy += DASH.gravity * dt; s.y += s.vy * dt;
  if (s.y < DASH.floor) { s.y = DASH.floor; s.vy = 0; }
  if (s.y > DASH.ceil) { s.y = DASH.ceil; s.vy = 0; }
  s.dist += DASH.speed * dt; s.invuln = Math.max(0, s.invuln - dt);
  while (s.nextPillarX < s.dist + 16 && s.nextPillarX < DASH.goal - 4) spawn(s);
  for (const p of s.pillars) {
    if (!p.passed && p.x < s.dist) { p.passed = true; s.score += 10; s.events.push({type: 'pass', value: 10}); }
    const inX = Math.abs(p.x - s.dist) < DASH.pillarW / 2 + DASH.radius, inGap = s.y > p.gapY - DASH.gap + DASH.radius && s.y < p.gapY + DASH.gap - DASH.radius;
    if (inX && !inGap && s.invuln <= 0) {
      s.lives -= 1; s.invuln = 1.5; s.vy = 3.5; s.events.push({type: 'hit', x: 0, y: s.y, value: s.lives});
      s.message = s.lives > 0 ? `Ouch! ${s.lives} ${s.lives === 1 ? 'life' : 'lives'} left` : 'Grounded.';
      if (s.lives <= 0) { s.phase = 'lost'; s.events.push({type: 'lose'}); return s; }
    }
  }
  for (const c of s.coinList) if (!c.taken && Math.abs(c.x - s.dist) < 0.55 && Math.abs(c.y - s.y) < 0.65) { c.taken = true; s.coins += 1; s.score += 5; s.events.push({type: 'coin', x: 0, y: c.y, value: 5}); }
  s.pillars = s.pillars.filter((p) => p.x > s.dist - 6); s.coinList = s.coinList.filter((c) => c.x > s.dist - 6);
  if (s.dist >= DASH.goal) { s.phase = 'won'; s.score += s.lives * 50; s.message = 'The castle! The court cheers.'; s.events.push({type: 'win'}); }
  return s;
}
export const dashProgress = (s: DashState): number => clamp(s.dist / DASH.goal, 0, 1);
