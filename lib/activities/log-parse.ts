import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {classifyActivity} from '@/lib/activities/classify';
import {metMinutes, resolve} from '@/lib/activities/ontology';
import type {EventKind} from '@/lib/activities/types';

/**
 * Manual log (§5.2): one sentence -> structured workout. Spark JSON schema, regex fallback when Muse is offline.
 * The embedder fills `kind` when neither can; code (ontology.ts), never a model, picks the Compendium code and MET-minutes.
 */
export type ParsedLog = {
  kind: EventKind;
  distanceKm?: number;
  durationMin?: number;
  steps?: number;
  whenOffsetHours?: number;
  usedMuse: boolean;
  activity?: string;
  compendiumCode?: string;
  metMinutes?: number;
};

const KIND_WORDS: [RegExp, EventKind][] = [
  [/\b(ran|run|running|jog|jogged|jogging|5k|10k|treadmill)\b/i, 'run'],
  [/\b(walk|walked|walking|hike|hiked|hiking|stroll)\b/i, 'walk'],
  [/\b(bike|biked|biking|cycle|cycled|cycling|ride|rode|spin|peloton)\b/i, 'ride'],
  [/\b(lift|lifted|lifting|weights|strength|gym|squats?|deadlifts?|bench|push-?ups?|pull-?ups?|hiit|crossfit)\b/i, 'strength'],
  [/\b(yoga|pilates|stretch|stretched|stretching|mobility)\b/i, 'yoga'],
  [/\b(swim|swam|swimming|laps)\b/i, 'swim'],
  [/\b(steps?)\b/i, 'steps'],
];

export function parseLogSentence(text: string): Omit<ParsedLog, 'usedMuse'> {
  const t = text.toLowerCase();
  let kind: EventKind = 'other';
  for (const [re, k] of KIND_WORDS) {
    if (re.test(t)) {
      kind = k;
      break;
    }
  }
  const out: Omit<ParsedLog, 'usedMuse'> = {kind};
  const dist = t.match(/(\d+(?:\.\d+)?)\s*(km|k\b|kilometers?|kilometres?|mi\b|miles?)/);
  if (dist) {
    const n = parseFloat(dist[1]);
    out.distanceKm = Math.round((dist[2].startsWith('mi') ? n * 1.609_34 : n) * 100) / 100;
  } else {
    const race = t.match(/\b(\d{1,2})k\b/);
    if (race && kind === 'run') out.distanceKm = parseInt(race[1], 10);
  }
  const hm = t.match(/(\d+)\s*(?:h|hr|hrs|hours?)\s*(?:(\d+)\s*(?:m|min|mins|minutes?))?/);
  const mins = t.match(/(\d+)\s*(?:m\b|min\b|mins\b|minutes?\b)/);
  const mmss = t.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (hm) out.durationMin = parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  else if (mins) out.durationMin = parseInt(mins[1], 10);
  else if (mmss) out.durationMin = mmss[3] ? parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10) + parseInt(mmss[3], 10) / 60 : parseInt(mmss[1], 10) + parseInt(mmss[2], 10) / 60;
  const steps = t.match(/(\d[\d,]*)\s*steps?/);
  if (steps) out.steps = parseInt(steps[1].replace(/,/g, ''), 10);
  if (/yesterday/.test(t)) out.whenOffsetHours = -24;
  else if (/this morning/.test(t)) out.whenOffsetHours = -6;
  else if (/last night/.test(t)) out.whenOffsetHours = -14;
  if (out.durationMin) out.durationMin = Math.round(out.durationMin * 10) / 10;
  return out;
}

const schema = {
  type: 'object',
  properties: {
    kind: {type: 'string', enum: ['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'steps', 'other']},
    distanceKm: {type: ['number', 'null']},
    durationMin: {type: ['number', 'null']},
    steps: {type: ['integer', 'null']},
    whenOffsetHours: {type: ['number', 'null']},
  },
  required: ['kind', 'distanceKm', 'durationMin', 'steps', 'whenOffsetHours'],
  additionalProperties: false,
};

/** Ontology activity -> vault EventKind (rowing, kayak and dance have no kind of their own yet). */
const ACTIVITY_KIND: Record<string, EventKind> = {
  run: 'run', trail_run: 'run', walk: 'walk', hike: 'walk', swim: 'swim', cycle: 'ride',
  strength: 'strength', bodyweight: 'strength', yoga: 'yoga', pilates: 'yoga', stretch: 'yoga',
  row_erg: 'other', row_water: 'other', kayak: 'other', dance: 'other',
};
const KIND_ACTIVITY: Partial<Record<EventKind, string>> = {run: 'run', walk: 'walk', ride: 'cycle', strength: 'strength', yoga: 'yoga', swim: 'swim'};
const SPEED_BANDED = new Set(['run', 'walk', 'cycle']);
const MIN_SCORE = 0.5; // below this the embedder's best guess is noise (e.g. "meditated 10 min")

/** Fill kind from the embedder when rules/Muse said 'other', then compute the Compendium code + MET-minutes in code. */
export async function withOntology(p: ParsedLog, text: string): Promise<ParsedLog> {
  let activity = KIND_ACTIVITY[p.kind];
  if (p.kind === 'other') {
    const [top] = await classifyActivity(text);
    if (top && top.score >= MIN_SCORE) activity = top.activity;
  }
  if (!activity) return p;
  const speedMph = SPEED_BANDED.has(activity) && p.distanceKm && p.durationMin ? p.distanceKm / 1.609_34 / (p.durationMin / 60) : undefined;
  const out: ParsedLog = {...p, kind: p.kind === 'other' ? ACTIVITY_KIND[activity] : p.kind, activity, compendiumCode: resolve(activity, {speedMph}).code};
  if (p.durationMin) out.metMinutes = metMinutes(activity, p.durationMin, {speedMph});
  return out;
}

export async function parseLog(text: string): Promise<ParsedLog> {
  return withOntology(await parseLogText(text), text);
}

async function parseLogText(text: string): Promise<ParsedLog> {
  const fallback = {...parseLogSentence(text), usedMuse: false};
  if (!museConfigured()) return fallback;
  try {
    const r = await museJson<{kind: EventKind; distanceKm: number | null; durationMin: number | null; steps: number | null; whenOffsetHours: number | null}>({
      model: MODELS.spark,
      schemaName: 'workout_log',
      schema,
      effort: 'minimal',
      input: `Extract one workout from this sentence. Convert miles to km (x1.609). whenOffsetHours is negative hours from now if the sentence says when (yesterday = -24), else null. Do not comment on health or bodies; only extract.\nSentence: ${text.slice(0, 400)}`,
    });
    return {
      kind: r.kind ?? fallback.kind,
      distanceKm: r.distanceKm ?? fallback.distanceKm,
      durationMin: r.durationMin ?? fallback.durationMin,
      steps: r.steps ?? fallback.steps,
      whenOffsetHours: r.whenOffsetHours ?? fallback.whenOffsetHours,
      usedMuse: true,
    };
  } catch {
    return fallback;
  }
}
