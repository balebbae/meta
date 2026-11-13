/**
 * The pace a running Reel talks about, read from its caption, transcript and tags: "5:30/km", "8 minute miles",
 * "6 min per km", "12 km/h". Pure. No pace found means the caller falls back to DEFAULT_PACE.
 */
export type ReelPace = {secPerKm: number; distanceKm: number | null};
/** When a running Reel names no pace the game takes one from the Reel's difficulty (7:30, 6:30, 5:30 per km), so a walk never claims land in a run game. */
export const DEFAULT_PACE: Record<string, number> = {easy: 450, medium: 390, hard: 330};

export const PACE_MIN = 150, PACE_MAX = 900; // 2:30 to 15:00 per km: anything outside is a typo or not a run
const MILE = 1.609344;
const perKm = (sec: number, unit: string): number => (/^mi/i.test(unit) ? sec / MILE : sec);

export function paceFromText(text: string): ReelPace | null {
  const t = text.toLowerCase();
  let sec: number | null = null;
  const clock = /(\d{1,2})[:'′](\d{2})\s*(?:min(?:ute)?s?)?\s*(?:\/|per|a|an)?\s*(km|kilomet(?:er|re)|mile|mi|k)\b/.exec(t); // 5:30/km, 8:45 per mile
  const words = /(\d{1,2}(?:\.\d)?)[\s-]*min(?:ute)?s?\s*(?:\/|per|a|an)?\s*(km|kilomet(?:er|re)|mile|mi)s?\b/.exec(t); // 6 min/km, 8 minute miles
  const speed = /(\d{1,2}(?:\.\d)?)\s*(km\/h|kph|kmh|mph)\b/.exec(t); // 12 km/h
  if (clock) sec = perKm(Number(clock[1]) * 60 + Number(clock[2]), clock[3]);
  else if (words) sec = perKm(Number(words[1]) * 60, words[2]);
  else if (speed && Number(speed[1]) > 0) sec = 3600 / (Number(speed[1]) * (speed[2] === 'mph' ? MILE : 1));
  if (sec == null || !(sec >= PACE_MIN && sec <= PACE_MAX)) return null;
  const far = /(?:^|[^\d:.\/])(\d{1,2}(?:\.\d)?)\s?(km|k|miles?|mi)\b(?!\s*\/)/.exec(t.replace(clock?.[0] ?? '\u0000', ' ').replace(speed?.[0] ?? '\u0000', ' ')); // "5k", "3 miles"
  const distanceKm = far ? Math.round(Number(far[1]) * (/^mi/.test(far[2]) ? MILE : 1) * 10) / 10 : null;
  return {secPerKm: Math.round(sec), distanceKm: distanceKm && distanceKm >= 0.5 && distanceKm <= 50 ? distanceKm : null};
}
