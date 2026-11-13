import data from './ontology.json' with {type: 'json'};
import type {Category} from './types.ts';

/**
 * Activity ontology (Compendium codes/METs, metrics, sensitivity categories). Port of finetune/rally_ft/ontology.py;
 * ontology.json is a verbatim copy of finetune/rally_ft/ontology.json — re-copy it, don't edit it here.
 */
export type CompendiumEntry = {code: string; met: number; desc: string};
type Band = CompendiumEntry & {min: number};
type Activity = {
  label: string;
  aliases: string[];
  default: CompendiumEntry;
  variants?: Record<string, CompendiumEntry>;
  by_speed_mph?: Band[];
  by_watts?: Band[];
  metrics: string[];
  equipment: string[];
};
export type OntologyCategory = keyof typeof data.categories;
export type Intensity = {speedMph?: number | null; watts?: number | null; variant?: string | null};

export const ONTOLOGY = data as unknown as {activities: Record<string, Activity>; metrics: Record<string, {unit: string; category: OntologyCategory; round: number}>};
export const ACTIVITY_IDS = Object.keys(ONTOLOGY.activities);

/** The Compendium entry {code, met, desc} (plus `min` when picked from an intensity band, as in Python) that best matches the activity and its intensity. Throws on unknown ids, like the Python. */
export function resolve(activity: string, {speedMph, watts, variant}: Intensity = {}): CompendiumEntry {
  const a = ONTOLOGY.activities[activity];
  if (!a) throw new Error(`unknown activity: ${activity}`);
  if (variant && a.variants && variant in a.variants) return a.variants[variant];
  if (speedMph != null && a.by_speed_mph) {
    const bands = a.by_speed_mph.filter(b => speedMph >= b.min);
    if (bands.length) return bands[bands.length - 1];
  }
  if (watts != null && a.by_watts) {
    const bands = a.by_watts.filter(b => watts >= b.min);
    if (bands.length) return bands[bands.length - 1];
  }
  return a.default;
}

export function metMinutes(activity: string, durationMin: number, intensity: Intensity = {}): number {
  return pyRound(resolve(activity, intensity).met * durationMin, 1);
}

/** Python's round(x, nd): rounds the exact binary value, exact ties go to even (round(4.25, 1) == 4.2). */
export function pyRound(x: number, nd: number): number {
  const exact = Math.abs(x).toFixed(100); // exact decimal expansion of the double
  const [int, frac] = exact.split('.');
  if (frac.slice(nd) !== '5'.padEnd(100 - nd, '0')) return Number(x.toFixed(nd));
  const down = `${int}.${frac.slice(0, nd)}`;
  const lastDigit = Number((nd ? frac[nd - 1] : int.at(-1)) ?? 0);
  const mag = lastDigit % 2 === 0 ? Number(down) : Number(down) + 10 ** -nd;
  return Math.sign(x) * Number(mag.toFixed(nd));
}

/**
 * Ontology sensitivity category -> policies.ts Category. Both vocabularies stay as they are.
 * effort (MET-minutes) is derived from workouts, so it shares their policy; reproductive_health is never imported.
 */
export const POLICY_CATEGORY: Record<OntologyCategory, Category | null> = {
  workout: 'workouts',
  effort: 'workouts',
  body_signal: 'heart',
  sleep: 'sleep',
  body: 'body',
  location: 'location',
  reproductive_health: null,
};

/** Policy category for an ontology metric. `steps` is a workout metric in the ontology but has its own policy row. */
export function policyCategoryForMetric(metric: string): Category | null {
  if (metric === 'steps') return 'steps';
  const m = ONTOLOGY.metrics[metric];
  return m ? POLICY_CATEGORY[m.category] : null;
}
