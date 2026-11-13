import {existsSync} from 'node:fs';
import path from 'node:path';
import activityVectors from './activity-vectors.json' with {type: 'json'};

/**
 * Text -> ontology activity with the fine-tuned bge-small embedder (embed/), run on the server by transformers.js.
 * The 15 activity vectors are constants (embed: `python -m rally_embed.export`), so a lookup is one embedding + 15 dots.
 * No model files (e.g. on Vercel, where embed/onnx/ is git-ignored) -> [] and callers fall back to their own rules.
 * Server-only (node:fs, onnxruntime-node).
 */
export type ActivityMatch = {activity: string; score: number};

const MODEL_ID = 'rally-embed';
const modelDir = () => process.env.RALLY_EMBED_DIR ?? path.join(process.cwd(), 'embed', 'onnx');

type Extractor = (text: string, opts: {pooling: 'cls'; normalize: boolean}) => Promise<{data: Float32Array}>;
const extractors = new Map<string, Promise<Extractor | null>>(); // keyed by model dir

async function open(dir: string): Promise<Extractor | null> {
  if (!existsSync(path.join(dir, MODEL_ID, 'onnx', 'model.onnx'))) return null;
  try {
    const {pipeline, env} = await import('@huggingface/transformers');
    env.localModelPath = dir;
    env.allowRemoteModels = false;
    return (await pipeline('feature-extraction', MODEL_ID, {dtype: 'fp32'})) as unknown as Extractor;
  } catch (e) {
    console.warn('classifyActivity: embedder unavailable', e);
    return null;
  }
}

function load(): Promise<Extractor | null> {
  const dir = modelDir();
  if (!extractors.has(dir)) extractors.set(dir, open(dir));
  return extractors.get(dir)!;
}

/** Top-k activities by cosine similarity of a (normalized) query vector against the activity vectors. */
export function rankActivities(query: ArrayLike<number>, k = 3): ActivityMatch[] {
  return activityVectors.ids
    .map((activity, i) => {
      const v = activityVectors.vectors[i];
      let score = 0;
      for (let j = 0; j < v.length; j++) score += v[j] * query[j];
      return {activity, score: Math.round(score * 1000) / 1000};
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Top-3 ontology activities for any feed/log text, or [] when the model isn't available. */
export async function classifyActivity(text: string): Promise<ActivityMatch[]> {
  const t = text.trim().slice(0, 500);
  if (!t) return [];
  const run = await load();
  if (!run) return [];
  try {
    const out = await run(activityVectors.prefix + t, {pooling: 'cls', normalize: true});
    return rankActivities(out.data);
  } catch (e) {
    console.warn('classifyActivity failed', e);
    return [];
  }
}
