/**
 * Photo Proof for moves and dares (§5.2, §19.1 "verify becomes the move and proof check"). Ember vision
 * returns {approved, verdict}. Fails closed (plan 5b): offline or on error the proof is 'pending', not approved,
 * and the move deals no damage until verified; the UI shows "Muse offline".
 */
import {MODELS, getMuseClient, museConfigured} from '../muse/client.ts'; // relative so the node test runner can load it
import {UNVERIFIED_PROOF} from './scoring.ts';
import {EXERCISE_CHECK_SCHEMA, exerciseCheckPrompt} from './exercise-check.ts';
import type {ExerciseCheck} from './proof-fusion.ts';

export type ProofResult = {approved: boolean; verdict: string; status: 'approved' | 'rejected' | 'pending'; museUsed: boolean};

/** One photo, or 2-3 still frames from a clip (then the question is about the clip). */
export async function verifyProofImage(opts: {image: string; task: string; frames?: string[]}): Promise<ProofResult> {
  if (process.env.GLIMMER_PROOF_URL?.trim()) {
    const t0 = Date.now();
    try {
      const r = await glimmerCheck(opts);
      console.info('[rally] proof check', {backend: 'glimmer', ms: Date.now() - t0, status: r.status});
      return r;
    } catch (err) {
      console.error('[rally] glimmer proof check failed, using Ember', {ms: Date.now() - t0, error: err instanceof Error ? err.name : 'unknown'});
    }
  }
  if (!museConfigured()) return {...UNVERIFIED_PROOF, verdict: 'Muse offline: proof saved, it counts once verified.'};
  const t0 = Date.now();
  try {
    const c = getMuseClient();
    const res = await c.responses.create({
      model: MODELS.ember,
      reasoning: {effort: 'minimal'},
      max_output_tokens: 800,
      input: [
        {
          role: 'user',
          content: [
            {type: 'input_text', text: `${opts.frames ? `These are still frames from one short video. Do they plausibly show someone doing: "${opts.task}"?` : `Does this photo plausibly show someone doing or having just done: "${opts.task}"?`} Describe only what is visible. Never comment on the person's body, looks, age or health. Reply as JSON {"approved": boolean, "verdict": string (max 12 words)}.`},
            ...(opts.frames ?? [opts.image]).map(url => ({type: 'input_image' as const, image_url: url, detail: 'low' as const})),
          ],
        },
      ],
      text: {format: {type: 'json_schema', name: 'proof', strict: true, schema: {type: 'object', properties: {approved: {type: 'boolean'}, verdict: {type: 'string'}}, required: ['approved', 'verdict'], additionalProperties: false}}},
    });
    const parsed = JSON.parse(res.output_text || '{}') as {approved?: boolean; verdict?: string};
    const approved = Boolean(parsed.approved);
    console.info('[rally] proof check', {backend: 'ember', ms: Date.now() - t0, status: approved ? 'approved' : 'rejected'});
    return {approved, verdict: String(parsed.verdict ?? '').slice(0, 120), status: approved ? 'approved' : 'rejected', museUsed: true};
  } catch (err) {
    console.error('[rally] proof check failed', err instanceof Error ? err.message : err);
    return {...UNVERIFIED_PROOF, verdict: 'Muse unavailable: proof saved, it counts once verified.'};
  }
}

/** Self-hosted fine-tuned Muse Glimmer (finetune/rally_ft exercise_check) on an OpenAI-compatible chat endpoint. Throws on timeout, HTTP error or bad JSON so the caller falls back to Ember. */
async function glimmerCheck(opts: {image: string; task: string; frames?: string[]}): Promise<ProofResult> {
  const base = process.env.GLIMMER_PROOF_URL!.trim().replace(/\/+$/, '');
  const key = process.env.GLIMMER_PROOF_KEY?.trim();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {'content-type': 'application/json', ...(key ? {authorization: `Bearer ${key}`} : {})},
    signal: AbortSignal.timeout(Number(process.env.GLIMMER_PROOF_TIMEOUT_MS) || 6000),
    body: JSON.stringify({
      model: process.env.GLIMMER_PROOF_MODEL?.trim() || 'exercise_check',
      temperature: 0,
      messages: [{role: 'user', content: [{type: 'text', text: exerciseCheckPrompt(opts.task)}, ...(opts.frames ?? [opts.image]).slice(0, 3).map(url => ({type: 'image_url', image_url: {url}}))]}],
      response_format: {type: 'json_schema', json_schema: {name: 'exercise_check', strict: true, schema: EXERCISE_CHECK_SCHEMA}},
      chat_template_kwargs: {reasoning_strength: 'low'},
    }),
  });
  if (!res.ok) throw new Error(`glimmer HTTP ${res.status}`);
  const data = (await res.json()) as {choices?: {message?: {content?: string}}[]};
  const c = JSON.parse(data.choices?.[0]?.message?.content ?? '') as ExerciseCheck;
  if (typeof c?.ok !== 'boolean' || typeof c.match !== 'boolean' || typeof c.why !== 'string' || !c.shows) throw new Error('glimmer returned invalid exercise_check JSON');
  const verdict = c.why.slice(0, 120);
  if (c.shows === 'unclear') return {...UNVERIFIED_PROOF, verdict, museUsed: true};
  // re-check ok against its own rule (shows a workout AND match) so an inconsistent answer can't approve
  const approved = c.ok && c.match && (c.shows === 'exercise_frames' || c.shows === 'workout_screen');
  return {approved, verdict, status: approved ? 'approved' : 'rejected', museUsed: true};
}
