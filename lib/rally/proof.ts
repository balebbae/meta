/**
 * Photo Proof for moves and dares (§5.2, §19.1 "verify becomes the move and proof check"). Ember vision
 * returns {approved, verdict}; offline the proof is accepted as 'pending' so the demo still works and the UI
 * shows "Muse offline".
 */
import {MODELS, getMuseClient, museConfigured} from '@/lib/muse/client';

export type ProofResult = {approved: boolean; verdict: string; status: 'approved' | 'rejected' | 'pending'; museUsed: boolean};

export async function verifyProofImage(opts: {image: string; task: string}): Promise<ProofResult> {
  if (!museConfigured()) return {approved: true, verdict: 'Muse offline: proof saved for review.', status: 'pending', museUsed: false};
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
            {type: 'input_text', text: `Does this photo plausibly show someone doing or having just done: "${opts.task}"? Describe only what is visible. Never comment on the person's body, looks, age or health. Reply as JSON {"approved": boolean, "verdict": string (max 12 words)}.`},
            {type: 'input_image', image_url: opts.image, detail: 'low'},
          ],
        },
      ],
      text: {format: {type: 'json_schema', name: 'proof', strict: true, schema: {type: 'object', properties: {approved: {type: 'boolean'}, verdict: {type: 'string'}}, required: ['approved', 'verdict'], additionalProperties: false}}},
    });
    const parsed = JSON.parse(res.output_text || '{}') as {approved?: boolean; verdict?: string};
    const approved = Boolean(parsed.approved);
    return {approved, verdict: String(parsed.verdict ?? '').slice(0, 120), status: approved ? 'approved' : 'rejected', museUsed: true};
  } catch (err) {
    console.error('[rally] proof check failed', err instanceof Error ? err.message : err);
    return {approved: true, verdict: 'Muse unavailable: proof saved for review.', status: 'pending', museUsed: false};
  }
}
