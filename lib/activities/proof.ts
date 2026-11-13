import {getMuseClient, MODELS, museConfigured} from '@/lib/muse/client';
import type {EventKind} from '@/lib/activities/types';

/**
 * Photo Proof (§5.2): Muse vision reads a treadmill / watch / bike screen or race bib into a structured
 * workout. Ember minimal first (1.4s measured), Spark fallback. Never comments on bodies or health.
 */
export type ProofResult = {
  kind: EventKind;
  distanceKm?: number;
  durationMin?: number;
  steps?: number;
  confidence: number;
  verdict: 'workout_screen' | 'race_bib' | 'unclear' | 'not_a_workout';
};

export type ProofOutcome = {result: ProofResult | null; usedMuse: boolean; model: string | null; fallback: 'spark' | 'manual' | null; error?: string};

const schema = {
  type: 'object',
  properties: {
    kind: {type: 'string', enum: ['run', 'walk', 'ride', 'strength', 'yoga', 'swim', 'steps', 'other']},
    distanceKm: {type: ['number', 'null']},
    durationMin: {type: ['number', 'null']},
    steps: {type: ['integer', 'null']},
    confidence: {type: 'number'},
    verdict: {type: 'string', enum: ['workout_screen', 'race_bib', 'unclear', 'not_a_workout']},
  },
  required: ['kind', 'distanceKm', 'durationMin', 'steps', 'confidence', 'verdict'],
  additionalProperties: false,
};

const PROMPT = `You read a photo of a fitness device or screen (treadmill, watch, bike computer, phone app, race bib) and extract the workout it shows.
Rules: only report numbers that are visibly printed. Convert miles to km (x1.609). Convert mm:ss to minutes as a decimal. If the image is not a workout screen, set verdict to not_a_workout and confidence 0. Idle, menu, all-zero/dash and lifetime or odometer total screens are not workout screens.
Never describe or comment on any person, body, weight or health condition in the image; only the device readout.
Return JSON matching the schema. confidence is 0..1.`;

async function callVision(model: string, dataUrl: string): Promise<ProofResult> {
  const c = getMuseClient();
  const response = await c.responses.create({
    model,
    reasoning: {effort: 'minimal'},
    max_output_tokens: 1200,
    input: [
      {
        role: 'user',
        content: [
          {type: 'input_text', text: PROMPT},
          {type: 'input_image', image_url: dataUrl, detail: 'auto'},
        ],
      },
    ],
    text: {format: {type: 'json_schema', name: 'photo_proof', schema, strict: true}},
  });
  const text = response.output_text;
  if (!text) throw new Error('empty Muse response');
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return {
    kind: (parsed.kind as EventKind) ?? 'other',
    distanceKm: typeof parsed.distanceKm === 'number' ? Math.round(parsed.distanceKm * 100) / 100 : undefined,
    durationMin: typeof parsed.durationMin === 'number' ? Math.round(parsed.durationMin * 10) / 10 : undefined,
    steps: typeof parsed.steps === 'number' ? Math.round(parsed.steps) : undefined,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    verdict: (parsed.verdict as ProofResult['verdict']) ?? 'unclear',
  };
}

export async function analyzeProof(dataUrl: string): Promise<ProofOutcome> {
  if (!museConfigured()) return {result: null, usedMuse: false, model: null, fallback: 'manual', error: 'Muse offline'};
  try {
    return {result: await callVision(MODELS.ember, dataUrl), usedMuse: true, model: MODELS.ember, fallback: null};
  } catch (emberErr) {
    try {
      return {result: await callVision(MODELS.spark, dataUrl), usedMuse: true, model: MODELS.spark, fallback: 'spark'};
    } catch (sparkErr) {
      return {result: null, usedMuse: false, model: null, fallback: 'manual', error: `${(emberErr as Error).message}; ${(sparkErr as Error).message}`};
    }
  }
}
