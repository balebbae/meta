/**
 * Gallery + game UI state (zustand). Preferences persist to localStorage under one key; nothing else is stored.
 * Rigs are never put in the store: components build them from the catalog and the cache owns disposal.
 */
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {AnimState, Category, HeroPreset, Variant} from '@/lib/kingdom/types';
import type {GameId} from '@/lib/kingdom/games/common';

export type Environment = 'studio' | 'meadow' | 'dusk';
export type ShadowQuality = 'off' | 'low' | 'high';
export type CameraPreset = 'front' | 'side' | 'threeQuarter';
export type HeroOverrides = Partial<Pick<HeroPreset, 'gender' | 'skin' | 'hair' | 'hairColor' | 'accessory' | 'beard' | 'seed'>>;

export type KingdomState = {
  category: Category; selectedId: string;
  hero: HeroOverrides; variant: Variant; rider: boolean; seed: number;
  anim: AnimState; autoRotate: boolean; environment: Environment; shadows: ShadowQuality; scaleRef: boolean;
  cameraPreset: CameraPreset; cameraNonce: number;
  game: GameId | null; best: Partial<Record<GameId, number>>; reducedMotion: boolean;
  select: (id: string, category?: Category) => void;
  setCategory: (c: Category) => void;
  setHero: (patch: HeroOverrides) => void;
  resetHero: () => void;
  setVariant: (v: Variant) => void;
  setRider: (on: boolean) => void;
  shuffleSeed: () => void;
  setAnim: (a: AnimState) => void;
  setAutoRotate: (on: boolean) => void;
  setEnvironment: (e: Environment) => void;
  setShadows: (s: ShadowQuality) => void;
  setScaleRef: (on: boolean) => void;
  setCameraPreset: (p: CameraPreset) => void;
  resetCamera: () => void;
  openGame: (g: GameId | null) => void;
  recordBest: (g: GameId, score: number) => void;
  setReducedMotion: (on: boolean) => void;
};

export const useKingdom = create<KingdomState>()(
  persist(
    (set) => ({
      category: 'heroes', selectedId: 'hero-iron',
      hero: {}, variant: 'medium', rider: false, seed: 1,
      anim: 'idle', autoRotate: true, environment: 'studio', shadows: 'high', scaleRef: false,
      cameraPreset: 'threeQuarter', cameraNonce: 0,
      game: null, best: {}, reducedMotion: false,
      select: (id, category) => set((s) => ({selectedId: id, category: category ?? s.category, anim: 'idle', cameraNonce: s.cameraNonce + 1})),
      setCategory: (category) => set({category}),
      setHero: (patch) => set((s) => ({hero: {...s.hero, ...patch}})),
      resetHero: () => set({hero: {}}),
      setVariant: (variant) => set({variant}),
      setRider: (rider) => set({rider}),
      shuffleSeed: () => set((s) => ({seed: (s.seed * 48271 + 11) % 2147483647, hero: {...s.hero, seed: (s.seed * 48271 + 11) % 2147483647}})),
      setAnim: (anim) => set({anim}),
      setAutoRotate: (autoRotate) => set({autoRotate}),
      setEnvironment: (environment) => set({environment}),
      setShadows: (shadows) => set({shadows}),
      setScaleRef: (scaleRef) => set({scaleRef}),
      setCameraPreset: (cameraPreset) => set((s) => ({cameraPreset, cameraNonce: s.cameraNonce + 1})),
      resetCamera: () => set((s) => ({cameraPreset: 'threeQuarter', cameraNonce: s.cameraNonce + 1})),
      openGame: (game) => set({game}),
      recordBest: (g, score) => set((s) => ({best: {...s.best, [g]: Math.max(s.best[g] ?? 0, score)}})),
      setReducedMotion: (reducedMotion) => set((s) => ({reducedMotion, autoRotate: reducedMotion ? false : s.autoRotate})),
    }),
    {
      name: 'kingdom.gallery',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({category: s.category, selectedId: s.selectedId, hero: s.hero, variant: s.variant, rider: s.rider, environment: s.environment, shadows: s.shadows, autoRotate: s.autoRotate, scaleRef: s.scaleRef, best: s.best}),
    },
  ),
);
