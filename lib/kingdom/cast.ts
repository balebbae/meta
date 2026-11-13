/**
 * Casting: which character from the catalog plays a Rally boss or a player. Pure and deterministic, so the same quest
 * and the same person look the same on every surface. No image generation: every character is a catalog build.
 */
import {C} from './palette.ts';
import {hashString} from './rng.ts';
import type {AnimState, BuildOptions, Gender, Tier} from './types.ts';

export type Cast = {assetId: string; options: BuildOptions};

/** Rally's boss kinds (lib/rally/spec.ts) and the creature that plays each one. */
const BOSS_ASSET: Record<string, string> = {
  goblin: 'creature-goblin',
  golem: 'creature-giant',
  dragon: 'creature-elder-dragon',
  serpent: 'creature-baby-dragon',
  yeti: 'creature-cyclops',
  spectre: 'creature-slime',
  beast: 'creature-cyclops',
};
export const BOSS_ASSET_IDS = [...new Set(Object.values(BOSS_ASSET))];

export function castBoss(kind: string): Cast {
  return {assetId: BOSS_ASSET[kind] ?? BOSS_ASSET_IDS[hashString(kind) % BOSS_ASSET_IDS.length], options: {variant: 'boss'}};
}

export const HERO_TIERS: Tier[] = ['page', 'squire', 'iron', 'silver', 'golden', 'champion'];
const GENDERS: Gender[] = ['fem', 'masc', 'neutral'];

/** The hero look a player picked in onboarding; when unset, looks come from their name. */
export type HeroPick = {gender: Gender; skin: number; seed: number};

/** The picker grid: every skin tone on every silhouette, each with its own hair/face seed. */
export const HERO_CHOICES: HeroPick[] = GENDERS.flatMap((gender, gi) => C.skin.map((skin, si) => ({gender, skin, seed: ((gi * 31 + si * 13) % 97) + 1})));

export const parseHero = (v: unknown): HeroPick | null => {
  if (v == null || typeof v !== 'object') return null;
  const h = v as Record<string, unknown>;
  const gender = h.gender as Gender;
  const skin = Number(h.skin);
  const seed = Math.floor(Number(h.seed));
  if (!GENDERS.includes(gender) || !(C.skin as readonly number[]).includes(skin) || !(seed >= 1 && seed <= 97)) return null;
  return {gender, skin, seed};
};

/** A player's hero: their pick when they made one, else looks come from their name; rank from the gear they have earned. */
export function castHero(name: string, gear: readonly string[] = [], pick?: HeroPick | null): Cast {
  const h = hashString(name.trim().toLowerCase() || 'player');
  const tier = HERO_TIERS[Math.min(gear.length, HERO_TIERS.length - 1)];
  return {
    assetId: `hero-${tier}`,
    options: {hero: pick ?? {gender: GENDERS[h % 3], skin: C.skin[(h >>> 3) % C.skin.length], seed: (h % 97) + 1}},
  };
}

export const castKey = (c: Cast, pose: AnimState = 'idle'): string => `${c.assetId}|${JSON.stringify(c.options)}|${pose}`;
