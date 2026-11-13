/** Tournament Joust: timing and aim. The foe reveals an opening lane before impact; match it and brace on time. */
import {type GameEvent, type Input, NO_INPUT, type Phase, clamp, edges, makeRandom} from './common.ts';

export type Lane = 0 | 1 | 2;
export type PassResult = 'perfect' | 'hit' | 'miss';
export const JOUST = {passes: 5, impactT: 2.4, passLen: 3.4, rail: 8, revealT: 1.2, window: 0.18, laneY: [0.35, 0.75, 1.15]} as const;

export type JoustState = {
  phase: Phase; t: number; pass: number; passT: number;
  playerLane: Lane; foeOpening: Lane; openingShown: boolean;
  playerX: number; foeX: number; braceT: number; resolved: boolean;
  playerScore: number; foeScore: number; results: PassResult[]; message: string;
  events: GameEvent[]; prev: Input; random: () => number;
};

export function createJoust(seed = 1): JoustState {
  return {phase: 'intro', t: 0, pass: 0, passT: 0, playerLane: 1, foeOpening: 1, openingShown: false, playerX: -JOUST.rail, foeX: JOUST.rail, braceT: -1, resolved: false,
    playerScore: 0, foeScore: 0, results: [], message: '', events: [], prev: {...NO_INPUT}, random: makeRandom(seed)};
}
function newPass(s: JoustState): void {
  s.pass += 1; s.passT = 0; s.openingShown = false; s.braceT = -1; s.resolved = false;
  s.foeOpening = Math.floor(s.random() * 3) as Lane; s.message = `Pass ${s.pass} of ${JOUST.passes}`;
}
export function startJoust(s: JoustState): JoustState { s.phase = 'playing'; s.pass = 0; s.playerScore = 0; s.foeScore = 0; s.results = []; newPass(s); return s; }

export function stepJoust(s: JoustState, input: Input, dt: number): JoustState {
  s.events = [];
  if (s.phase !== 'playing') return s;
  const e = edges(s.prev, input); s.prev = {...input};
  s.t += dt; s.passT += dt;
  if (e.up) s.playerLane = clamp(s.playerLane + 1, 0, 2) as Lane;
  if (e.down) s.playerLane = clamp(s.playerLane - 1, 0, 2) as Lane;
  if (!s.openingShown && s.passT >= JOUST.impactT - JOUST.revealT) { s.openingShown = true; s.events.push({type: 'message', text: ['Low opening!', 'Middle opening!', 'High opening!'][s.foeOpening]}); }
  if (e.action && s.braceT < 0 && s.passT <= JOUST.impactT + JOUST.window) { s.braceT = s.passT; s.events.push({type: 'swing'}); }
  const k = Math.min(1, s.passT / JOUST.impactT), over = Math.max(0, (s.passT - JOUST.impactT) / (JOUST.passLen - JOUST.impactT));
  s.playerX = -JOUST.rail * (1 - k) + over * JOUST.rail * 0.5; s.foeX = JOUST.rail * (1 - k) - over * JOUST.rail * 0.5;
  if (!s.resolved && s.passT >= JOUST.impactT) {
    s.resolved = true;
    const match = s.playerLane === s.foeOpening, timed = s.braceT >= 0 && Math.abs(s.braceT - JOUST.impactT) <= JOUST.window;
    if (match && timed) { s.playerScore += 3; s.results.push('perfect'); s.message = 'Perfect strike! The goblin is unhorsed.'; s.events.push({type: 'hit', x: 0, y: 1, value: 3}, {type: 'sparkle', x: 0, y: 1.4}); }
    else if (match) { s.playerScore += 1; s.results.push('hit'); s.message = 'A solid hit.'; s.events.push({type: 'hit', x: 0, y: 1, value: 1}); }
    else { s.foeScore += 1; s.results.push('miss'); s.message = 'Missed the opening. The goblin lands a blow.'; s.events.push({type: 'hit', x: 0, y: 1, value: 0}); }
    s.events.push({type: 'score', value: s.playerScore});
  }
  if (s.passT >= JOUST.passLen) {
    if (s.pass >= JOUST.passes) { s.phase = s.playerScore > s.foeScore ? 'won' : 'lost'; s.message = s.phase === 'won' ? 'Champion of the lists!' : 'The goblin takes the tourney. Rematch?'; s.events.push({type: s.phase === 'won' ? 'win' : 'lose'}); }
    else newPass(s);
  }
  return s;
}
export function joustScore(s: JoustState): number { return s.playerScore * 100 + (s.phase === 'won' ? 250 : 0); }
