/**
 * "A few months ahead": pure matching math + the code-side relay filter. No DB, no Muse, so it's testable.
 * Matching only ever sees Answers values (rounded strings like "about 15 km", "3-4"), never raw vault rows.
 */

/** Weekly level over the last 7 days. null = unknown / withheld. */
export type Level = {km: number | null; days: number | null};
export type AheadFit = {metric: 'km' | 'days'; me: number; them: number; target: number; fit: number};

/** Answers value -> number: 12 | "about 12 km" | "under 1 km" | "3-4" | "5+" | "0". Booleans and null carry no level. */
export function levelValue(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  if (/under 1/.test(v)) return 0.5;
  const range = v.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const plus = v.match(/(\d+)\s*\+/);
  if (plus) return Number(plus[1]) + 0.5;
  const n = v.match(/\d+(\.\d+)?/);
  return n ? Number(n[0]) : null;
}

/**
 * Where someone could realistically be in ~3 months of steady, gradual progress.
 * shortcut: fixed heuristics (≈ +60% volume, +2 days), not a per-person trajectory; upgrade once vaults hold months of history.
 */
export function targetFor(me: Level): {km: number; days: number} {
  const km = me.km == null || me.km < 1 ? 10 : Math.round(me.km * 1.6 + 4);
  const days = Math.min(6, Math.max(3, Math.round((me.days ?? 0) + 2)));
  return {km, days};
}

const closeness = (them: number, target: number) => 1 - Math.abs(them - target) / target;

/** Best metric on which `them` sits near my 3-month target (and clearly ahead of me today), or null. */
export function aheadFit(me: Level, them: Level): AheadFit | null {
  const t = targetFor(me);
  const fits: AheadFit[] = [];
  const myKm = me.km ?? 0;
  const myDays = me.days ?? 0;
  if (them.km != null && them.km > myKm * 1.15 + 1) fits.push({metric: 'km', me: myKm, them: them.km, target: t.km, fit: closeness(them.km, t.km)});
  if (them.days != null && them.days >= myDays + 1) fits.push({metric: 'days', me: myDays, them: them.days, target: t.days, fit: closeness(them.days, t.days)});
  const best = fits.sort((a, b) => b.fit - a.fit)[0];
  return best && best.fit >= 0.35 ? best : null;
}

/**
 * Code-side relay filter, applied before AND after the Muse rewrites a message, so contact details never cross
 * even if the model is talked into it: emails, URLs, phone numbers and @handles.
 */
export function scrubContact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[contact removed]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]')
    .replace(/\b[\w-]+\.(?:com|net|org|io|me|co|app|gg|ly)(?:\/\S*)?\b/gi, '[link removed]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number removed]')
    .replace(/(^|\s)@[\w.]{2,}/g, '$1[handle removed]')
    .trim()
    .slice(0, 600);
}
