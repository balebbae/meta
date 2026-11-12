import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import type {EventKind} from '@/lib/activities/types';

/** Manual log (§5.2): one sentence -> structured workout. Spark JSON schema, regex fallback when Muse is offline. */
export type ParsedLog = {kind: EventKind; distanceKm?: number; durationMin?: number; steps?: number; whenOffsetHours?: number; usedMuse: boolean};

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

export async function parseLog(text: string): Promise<ParsedLog> {
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
