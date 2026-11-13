/** Creature stats by kind and variant. Pure data: games and tests import this without touching three. */
import type {CreatureKind, Variant} from './types';

export type Difficulty = {hp: number; damage: number; speed: number; reward: number};
export const DIFFICULTY: Record<CreatureKind, Record<Variant, Difficulty>> = {
  slime: {small: {hp: 2, damage: 1, speed: 0.9, reward: 5}, medium: {hp: 4, damage: 1, speed: 1.0, reward: 10}, boss: {hp: 14, damage: 2, speed: 0.8, reward: 60}},
  goblin: {small: {hp: 3, damage: 1, speed: 1.4, reward: 8}, medium: {hp: 5, damage: 2, speed: 1.3, reward: 15}, boss: {hp: 18, damage: 3, speed: 1.1, reward: 80}},
  cyclops: {small: {hp: 6, damage: 2, speed: 0.8, reward: 20}, medium: {hp: 10, damage: 3, speed: 0.8, reward: 35}, boss: {hp: 30, damage: 5, speed: 0.6, reward: 150}},
  giant: {small: {hp: 10, damage: 3, speed: 0.5, reward: 30}, medium: {hp: 16, damage: 4, speed: 0.5, reward: 50}, boss: {hp: 45, damage: 7, speed: 0.4, reward: 220}},
  babyDragon: {small: {hp: 5, damage: 2, speed: 1.6, reward: 25}, medium: {hp: 8, damage: 2, speed: 1.5, reward: 40}, boss: {hp: 24, damage: 4, speed: 1.3, reward: 160}},
  elderDragon: {small: {hp: 12, damage: 3, speed: 1.0, reward: 60}, medium: {hp: 22, damage: 4, speed: 0.9, reward: 120}, boss: {hp: 44, damage: 6, speed: 0.7, reward: 400}},
};
