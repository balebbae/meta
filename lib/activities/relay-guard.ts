/**
 * Deterministic leak check run on what a Muse relays between two anonymous people (plan §4). Pure, so it's testable.
 * Flags health numbers, names, contact details and places more specific than a city. Tuned to miss rather than
 * over-flag: a hit costs the message (retry, then a template), so training talk ("5 km", "3x10", "week 4") must pass.
 */
import {CONTACT} from './ahead.ts';

export type Leak = {type: 'health' | 'name' | 'contact' | 'place'; match: string};

const HEALTH: RegExp[] = [
  /\b\d{2,3}(?:\.\d+)?\s*(?:lbs?|pounds|kgs?|kilos?)\b/gi,
  /\bweigh(?:s|ed|t|ing)?\b[^.\d]{0,15}\d{2,3}\b/gi,
  /\b\d[\d,]*\s*(?:k?cals?|kcal|calories)\b/gi,
  /\b\d{2,3}\s*bpm\b/gi,
  /\b(?:[Hh]eart rate|HR|[Pp]ulse)\b[^.\d]{0,20}\d{2,3}\b/g, // case-sensitive HR: '1 hr easy, then 10 strides' is a duration
  /\b(?:slept|sleep(?:ing)?)\b[^.,\d]{0,12}\d+(?:\.\d+)?\s*(?:h|hrs?|hours?|mins?|minutes?)\b/gi,
  /\b\d+(?:\.\d+)?\s*(?:h|hrs?|hours?)\s+(?:of\s+)?sleep/gi,
  /\bBMI\b[^.\d]{0,10}\d/gi,
  /\b\d+(?:\.\d+)?\s*%\s*(?:body\s*fat|bf)\b|\bbody\s*fat\b[^.\d]{0,15}\d/gi,
];
// a weight right after a lift ("squat 100 kg", "3x5 @ 60kg") is a training load, not a body weight
const LIFT = /(?:squat|bench|deadlift|press|lift|row|curl|clean|snatch|jerk|carry|pull|dumbbell|barbell|kettlebell|weighted|vest|plates?|load|\d\s*x\s*\d)[^.]{0,30}$/i;
// ...or right before one ("hit 225 lb on bench", "60 kg squat")
const LIFT_AFTER = /^[^.]{0,20}?\b(?:squat|bench|deadlift|press|lift|row|curl|clean|snatch|jerk|carry|pull[- ]?up|dumbbell|barbell|kettlebell|for reps|x\s*\d)/i;

const PLACE: RegExp[] = [
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Pkwy|Hwy)\b/g,
  /\bat\s+(?:the\s+)?(?:[A-Z0-9][\w'&.-]*\s+){1,3}(?:Gym|Fitness|CrossFit|Studio|Club|Box|Park|Track|Center|Centre|Pool)\b/g,
];

/** Capitalised words that are not names. shortcut: small fixed list, extend when real relay logs show false hits. */
const COMMON = new Set(
  ('I Im Ive Id Ill They Their Them Theyre He She We You Your My Our It Its This That These Those The A An And But Or So If When What Why How Who Where Which Hi Hey Thanks Thank Yes No Ok Okay ' +
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday Mon Tue Wed Thu Fri Sat Sun January February March April May June July August September October November December ' +
    'Muse Muses Turf Rally Activities Week Weeks Strava Garmin Fitbit Apple Watch Peloton Zwift Nike Parkrun Couch Spotify YouTube Instagram Facebook Google Christmas Easter New Year').split(' '),
);
const CITY_CUE = /\b(?:in|from|near|around|outside)\s+$/i;

/** Capitalised tokens mid-sentence in the raw text that look like names (not sentence starts, cities or common words). */
function nameCandidates(raw: string): string[] {
  const out = new Set<string>();
  for (const m of raw.matchAll(/\b[A-Z][a-z]{2,}\b/g)) {
    const before = raw.slice(0, m.index);
    if (/(?:^|[.!?:\n]\s*|["“(]\s*)$/.test(before) || CITY_CUE.test(before) || COMMON.has(m[0])) continue;
    out.add(m[0]);
  }
  return [...out];
}

const word = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

/** Leaks in `text`. `names` = the two people's names; `raw` = what was typed (source of extra name candidates). */
export function findLeaks(text: string, {names = [], raw = ''}: {names?: string[]; raw?: string} = {}): Leak[] {
  const leaks: Leak[] = [];
  for (const re of HEALTH)
    for (const m of text.matchAll(re)) if (!(re === HEALTH[0] && (LIFT.test(text.slice(0, m.index)) || LIFT_AFTER.test(text.slice(m.index! + m[0].length))))) leaks.push({type: 'health', match: m[0]});
  for (const [re] of CONTACT) for (const m of text.matchAll(re)) leaks.push({type: 'contact', match: m[0].trim()});
  for (const re of PLACE) for (const m of text.matchAll(re)) leaks.push({type: 'place', match: m[0]});
  const tokens = new Set([...names.flatMap(n => n.split(/\s+/)).filter(t => t.length >= 2 && !COMMON.has(t)), ...nameCandidates(raw)]);
  for (const t of tokens) if (word(t).test(text)) leaks.push({type: 'name', match: t});
  return leaks;
}

/** Counts by type, safe to log (never the leaked text). */
export const leakCounts = (leaks: Leak[]) => leaks.reduce<Record<string, number>>((c, l) => ({...c, [l.type]: (c[l.type] ?? 0) + 1}), {});
