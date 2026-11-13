/**
 * Shared game-loop types. Every game is a pure module: create(seed) → state, start(state), step(state, input, dt) → state.
 * Scenes own rendering and input; logic never imports three. `events` is cleared every step and lists what happened
 * during that step so a scene can spawn effects.
 */
import {rng} from '../rng.ts';

export type Phase = 'intro' | 'playing' | 'won' | 'lost';
export type GameId = 'joust' | 'dash' | 'defense' | 'quest';

export type Input = {left: boolean; right: boolean; up: boolean; down: boolean; action: boolean; jump: boolean};
export const NO_INPUT: Readonly<Input> = {left: false, right: false, up: false, down: false, action: false, jump: false};

export type GameEvent = {
  type: 'hit' | 'score' | 'coin' | 'sparkle' | 'puff' | 'stomp' | 'open' | 'win' | 'lose' | 'wave' | 'flap' | 'pass' | 'swing' | 'message';
  x?: number; y?: number; z?: number; value?: number; text?: string;
};

/** Rising edges between two input snapshots. */
export function edges(prev: Input, now: Input): Input {
  return {left: now.left && !prev.left, right: now.right && !prev.right, up: now.up && !prev.up, down: now.down && !prev.down, action: now.action && !prev.action, jump: now.jump && !prev.jump};
}
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const makeRandom = (seed: number): (() => number) => rng(seed);

export type GameInfo = {id: GameId; title: string; blurb: string; howTo: string[]; desktop: string; touch: string};
export const GAME_INFO: Record<GameId, GameInfo> = {
  joust: {id: 'joust', title: 'Tournament Joust', blurb: 'Five passes against a goblin rider. Read the opening, aim, brace at impact.',
    howTo: ['Your foe lowers its shield just before impact and leaves one height open: low, middle or high.', 'Move your lance to that height, then brace at the moment the lances meet for a perfect strike.', 'Perfect strikes score 3, plain hits 1. Miss the opening and the foe scores instead.'],
    desktop: '↑ / ↓ or W / S to aim · Space to brace', touch: 'Aim buttons · tap BRACE at impact'},
  dash: {id: 'dash', title: 'Dragon Dash', blurb: 'Flap the Baby Dragon through the tower gaps to the royal castle, collecting gold on the way.',
    howTo: ['Tap or press to flap. Gravity does the rest.', 'Fly through the gap in each tower pair. Hitting a tower costs a life; you have three.', 'Gold coins are worth 5, every tower passed 10. Reach the castle to win.'],
    desktop: 'Space / ↑ / W to flap', touch: 'Tap anywhere to flap'},
  defense: {id: 'defense', title: 'Castle Defense', blurb: 'Hold three lanes in front of the gate through five waves and the Elder Dragon.',
    howTo: ['Creatures march down three lanes toward the gate. Step into their lane and swing when they are close.', 'Each kind has its own health and speed; bosses take many swings. Anything that reaches the gate chips at it.', 'Clear all five waves before the gate falls. Gate health left at the end is bonus gold.'],
    desktop: '← / → or A / D to change lane · Space to swing', touch: 'Lane buttons · tap SWING'},
  quest: {id: 'quest', title: 'Royal Quest', blurb: 'Find the crown, the scepter and the orb in the garden maze and bring them to the castle gate before time runs out.',
    howTo: ['Walk the hedge maze tile by tile. Step onto a chest to open it.', 'Moss slimes patrol the paths. Touching one costs a heart; you have three.', 'With all three treasures, reach the gate at the bottom. Time and hearts left are bonus gold.'],
    desktop: 'Arrows or WASD to walk', touch: 'D-pad to walk'},
};
