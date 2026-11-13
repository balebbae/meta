import {createHash} from 'node:crypto';
import OpenAI from 'openai';
import {sql} from '../db.ts'; // relative so the node test runner can load it

let client: OpenAI | null = null;

export function museConfigured(): boolean {
  return Boolean(process.env.MODEL_API_KEY?.trim());
}

/** OpenAI-compatible client pointed at Meta Model API. */
export function getMuseClient(): OpenAI {
  const apiKey = process.env.MODEL_API_KEY?.trim();
  if (!apiKey) throw new Error('MODEL_API_KEY is not set');
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: 'https://api.meta.ai/v1',
    });
  }
  return client;
}

export type JsonSchema = Record<string, unknown>;

/** Run a Responses call with JSON-schema structured output and parse it. */
export async function museJson<T>(opts: {
  model: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
  effort?: 'minimal' | 'low' | 'medium' | 'high';
  /** Built-in tools Muse may use before answering, e.g. [{type: 'web_search'}]. */
  tools?: OpenAI.Responses.Tool[];
}): Promise<T> {
  const key = `${opts.schemaName}|${opts.input}|${JSON.stringify(opts.tools ?? null)}`;
  const text = await traced(opts.schemaName, opts.model, key, async () => {
  const c = getMuseClient();
  const response = await c.responses.create({
    model: opts.model,
    input: opts.input,
    reasoning: {effort: opts.effort ?? 'low'},
    tools: opts.tools,
    text: {
      format: {
        type: 'json_schema',
        name: opts.schemaName,
        schema: opts.schema,
        strict: true,
      },
    },
  });
  // With tools Muse narrates between calls ("I'll look that up…"); the JSON is the last message.
  const last = opts.tools ? response.output.filter(o => o.type === 'message').at(-1) : undefined;
  const out = last ? last.content.map(c => (c.type === 'output_text' ? c.text : '')).join('') : response.output_text;
  if (!out) throw new Error('empty Muse response');
  return out;
  });
  return JSON.parse(text) as T;
}

export const MODELS = {
  ember: 'muse-ember-1.0',
  spark: 'muse-spark-1.3',
  image: 'muse-image-1.0',
  voice: 'muse-voice-transcribe-1.0',
} as const;

export async function museText(input: string): Promise<string> {
  return traced('text', MODELS.ember, `text|${input}`, async () => {
    const response = await getMuseClient().responses.create({model: MODELS.ember, input});
    const text = response.output_text?.trim();
    if (!text) throw new Error('empty Muse response');
    return text;
  });
}

/** MUSE_CACHE: `fallback` (default) serves the last good reply when Muse fails, `replay` serves it first, `off` disables. */
function cacheMode(): 'fallback' | 'replay' | 'off' {
  const m = process.env.MUSE_CACHE?.trim();
  return m === 'replay' || m === 'off' ? m : 'fallback';
}

const hasDb = () => Boolean(process.env.DATABASE_URL?.trim());

async function cached(key: string): Promise<string | null> {
  if (!hasDb()) return null;
  try {
    const rows = await sql`select output from muse_cache where key = ${key}`;
    return (rows[0]?.output as string | undefined) ?? null;
  } catch {
    return null;
  }
}

async function record(row: {task: string; model: string; ok: boolean; cached: boolean; ms: number; inputChars: number; output?: string; error?: string}, cacheKey?: string, cacheOutput?: string) {
  if (!hasDb()) return;
  try {
    // Only a short preview is traced; prompts can hold private vault data.
    await sql`insert into muse_calls (task, model, ok, cached, ms, input_chars, output_preview, error)
      values (${row.task}, ${row.model}, ${row.ok}, ${row.cached}, ${row.ms}, ${row.inputChars}, ${row.output?.slice(0, 280) ?? null}, ${row.error?.slice(0, 280) ?? null})`;
    if (cacheKey && cacheOutput) {
      await sql`insert into muse_cache (key, output) values (${cacheKey}, ${cacheOutput})
        on conflict (key) do update set output = excluded.output, updated_at = now()`;
    }
  } catch {
    // Tracing must never break a Muse feature (e.g. table not migrated yet).
  }
}

async function traced(task: string, model: string, prompt: string, run: () => Promise<string>): Promise<string> {
  const mode = cacheMode();
  const key = createHash('sha256').update(`${model}|${prompt}`).digest('hex');
  const started = Date.now();
  const base = {task, model, inputChars: prompt.length};
  if (mode === 'replay') {
    const hit = await cached(key);
    if (hit) {
      await record({...base, ok: true, cached: true, ms: Date.now() - started, output: hit});
      return hit;
    }
  }
  try {
    const out = await run();
    await record({...base, ok: true, cached: false, ms: Date.now() - started, output: out}, mode === 'off' ? undefined : key, out);
    return out;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (mode === 'fallback') {
      const hit = await cached(key);
      if (hit) {
        await record({...base, ok: true, cached: true, ms: Date.now() - started, output: hit, error});
        return hit;
      }
    }
    await record({...base, ok: false, cached: false, ms: Date.now() - started, error});
    throw e;
  }
}
