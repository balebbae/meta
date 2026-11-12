/** Player colours, assigned in invite order (2 to 8 players). Distinct in light and dark mode. */
export const TURF_COLORS = ['#1877F2', '#F02849', '#31A24C', '#F7B928', '#8A3FFC', '#F5533D', '#00A3A3', '#E84393'];
export const NEUTRAL = '#8A8D91';

export function colorAt(index: number): string {
  return TURF_COLORS[index % TURF_COLORS.length];
}
