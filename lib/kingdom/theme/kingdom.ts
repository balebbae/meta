/** Beta Kingdom: the first theme. Roles map to catalog ids; games and UI read roles, never asset ids. */
import type {Theme} from '../types';

export const KINGDOM_THEME: Theme = {
  id: 'kingdom',
  name: 'Beta Kingdom',
  palette: {background: '#f7efe6', accent: '#2d6cdf', accent2: '#f29a3a', text: '#241f2b', ground: '#dccfbc'},
  roles: {
    starter: 'hero-page',
    defender: 'hero-iron',
    champion: 'hero-champion',
    ruler: 'royal-king',
    smallEnemy: 'creature-goblin',
    heavyEnemy: 'creature-giant',
    boss: 'creature-elder-dragon',
    mount: 'mount-chestnut',
  },
  labels: {
    gallery: 'Beta Kingdom',
    tagline: 'Pixel heroes, mean kaijus and castles.',
    joust: 'Tournament Joust',
    dash: 'Dragon Dash',
    defense: 'Castle Defense',
    quest: 'Royal Quest',
    currency: 'gold',
  },
  ornament: {frame: 'scroll', divider: 'crown'},
  effects: {hitColor: 0xd7263d, sparkleColor: 0xe9b94a, puffColor: 0xf7f1e6},
};
