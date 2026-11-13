/** Theme registry. A second theme (space, etc.) adds a Theme here plus its own catalog ids; nothing else changes. */
import type {Theme} from '../types';
import {KINGDOM_THEME} from './kingdom';

export const THEMES: Record<string, Theme> = {kingdom: KINGDOM_THEME};
export const DEFAULT_THEME_ID = 'kingdom';
export function getTheme(id: string = DEFAULT_THEME_ID): Theme { return THEMES[id] ?? KINGDOM_THEME; }
