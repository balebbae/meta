/**
 * Worlds: the same games in a different place. A world never changes a rule or a score; it recolours the ground, the
 * props and the kaijus, relights the stage and swaps the weather. Heroes keep their own look in every world.
 * Each group chat lives in one world (worldFor), so two chats playing the same game do not look the same.
 */
import {Color, SRGBColorSpace} from 'three';
import type {MatKind} from '../factories/soft';

export type WorldId = 'kingdom' | 'space' | 'reef' | 'frost';
/** The hue and saturation a material kind takes (0-1), and what its lightness is multiplied by, so light and dark shades of a kind stay apart. */
type Tone = [hue: number, sat: number, light: number];
export type World = {
  id: WorldId; name: string; tagline: string; sky: number;
  light: {sky: number; ground: number; sun: number};
  /** Ground and props, by material kind. Kinds left out keep their colour. */
  props: Partial<Record<MatKind, Tone>>;
  /** The colour every kaiju's hide takes here. */
  kaiju: Tone | null;
  weather: 'clouds' | 'stars' | 'bubbles' | 'snow';
};

export const WORLDS: Record<WorldId, World> = {
  kingdom: {id: 'kingdom', name: 'Beta Kingdom', tagline: 'Castles, meadows and mean kaijus.', sky: 0xbfe3ff, light: {sky: 0xe8f4ff, ground: 0xa7b59c, sun: 0xfff6e2}, props: {}, kaiju: null, weather: 'clouds'},
  space: {
    id: 'space', name: 'Out of This World', tagline: 'Moon dust, glowing trees and alien kaijus.', sky: 0x1b1446, light: {sky: 0xcfc4ff, ground: 0x4a3a86, sun: 0xf1eaff},
    props: {grass: [0.72, 0.3, 0.9], leaf: [0.47, 0.75, 1.15], stone: [0.7, 0.22, 0.85], rock: [0.7, 0.2, 0.8], wood: [0.83, 0.35, 0.9], sand: [0.74, 0.25, 0.8], water: [0.7, 0.55, 0.3]},
    kaiju: [0.31, 0.8, 1], weather: 'stars',
  },
  reef: {
    id: 'reef', name: 'Under the Sea', tagline: 'Sand, coral and kaijus from the deep.', sky: 0x2e9cc4, light: {sky: 0xc9f6ff, ground: 0x2f7d99, sun: 0xe2fbff},
    props: {grass: [0.12, 0.55, 1.3], leaf: [0.97, 0.75, 1.2], stone: [0.11, 0.55, 0.92], // the castle is a sandcastle down here
      rock: [0.52, 0.28, 0.9], wood: [0.07, 0.5, 1]},
    kaiju: [0.62, 0.6, 0.95], weather: 'bubbles',
  },
  frost: {
    id: 'frost', name: 'Snow Day', tagline: 'Fresh snow, frosted pines and ice kaijus.', sky: 0xd6ecff, light: {sky: 0xffffff, ground: 0xc4d9ee, sun: 0xfffaf0},
    props: {grass: [0.58, 0.3, 1.55], leaf: [0.45, 0.3, 0.95], stone: [0.58, 0.22, 1.05], rock: [0.58, 0.2, 1.08], sand: [0.58, 0.2, 1.2], water: [0.55, 0.6, 1.2]},
    kaiju: [0.55, 0.5, 1.12], weather: 'snow',
  },
};
export const WORLD_IDS = Object.keys(WORLDS) as WorldId[];
/** The world a group chat plays in. shortcut: fixed by the chat's id; store a choice on the conversation once people ask to pick. */
export const worldFor = (conversationId: number | null | undefined): WorldId => (conversationId ? WORLD_IDS[Math.abs(Math.trunc(conversationId)) % WORLD_IDS.length] : 'kingdom');

const HIDE = new Set<MatKind>(['skin', 'slime', 'scale', 'rock', 'stone', 'grass', 'leaf']), c = new Color(), hsl = {h: 0, s: 0, l: 0};
/** A colour as this world shows it: `creature` picks the kaiju rule (hides only), otherwise the prop rule for the kind. */
export function tint(w: World, kind: MatKind, color: number, creature = false): number {
  const t = creature ? (HIDE.has(kind) ? w.kaiju : null) : w.props[kind];
  if (!t) return color;
  c.setHex(color).getHSL(hsl, SRGBColorSpace);
  return c.setHSL(t[0], t[1], Math.min(0.96, Math.max(0.05, hsl.l * t[2])), SRGBColorSpace).getHex();
}
