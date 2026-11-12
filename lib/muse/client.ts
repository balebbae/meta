import OpenAI from 'openai';

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
}): Promise<T> {
  const c = getMuseClient();
  const response = await c.responses.create({
    model: opts.model,
    input: opts.input,
    reasoning: {effort: opts.effort ?? 'low'},
    text: {
      format: {
        type: 'json_schema',
        name: opts.schemaName,
        schema: opts.schema,
        strict: true,
      },
    },
  });
  const text = response.output_text;
  if (!text) throw new Error('empty Muse response');
  return JSON.parse(text) as T;
}

export const MODELS = {
  ember: 'muse-ember-1.0',
  spark: 'muse-spark-1.3',
  image: 'muse-image-1.0',
  voice: 'muse-voice-transcribe-1.0',
} as const;
