import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {verifyProofImage} from './proof.ts';

// One global fetch stub (the OpenAI client captures fetch when first built); each test swaps the handlers.
type Call = {url: string; body: Record<string, unknown>; headers: Record<string, string>};
let calls: Call[] = [];
let glimmer: (init: RequestInit) => Promise<Response>;
let ember: () => Promise<Response>;
globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  calls.push({url, body: JSON.parse(String(init.body)), headers: Object.fromEntries(new Headers(init.headers).entries())});
  return url.startsWith('https://glimmer.test/') ? glimmer(init) : ember();
}) as typeof fetch;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
const emberSays = (approved: boolean, verdict: string) => () => Promise.resolve(json({id: 'r', object: 'response', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text: JSON.stringify({approved, verdict})}]}]}));
const glimmerSays = (check: Record<string, unknown>) => () => Promise.resolve(json({choices: [{message: {role: 'assistant', content: JSON.stringify(check)}}]}));
const check = (extra: Record<string, unknown>) => ({shows: 'exercise_frames', ex: 'push_up', match: true, km: null, min: null, steps: null, ok: true, why: 'Push-ups visible across the frames.', ...extra});
const IMG = 'data:image/jpeg;base64,AAAA';

beforeEach(() => {
  calls = [];
  process.env.MODEL_API_KEY = 'test-key';
  for (const k of ['GLIMMER_PROOF_URL', 'GLIMMER_PROOF_KEY', 'GLIMMER_PROOF_MODEL', 'GLIMMER_PROOF_TIMEOUT_MS']) delete process.env[k];
  glimmer = () => Promise.reject(new Error('glimmer must not be called'));
  ember = emberSays(true, 'Looks like push-ups.');
});

test('GLIMMER_PROOF_URL unset: only the unchanged Ember request is made', async () => {
  const r = await verifyProofImage({image: IMG, task: 'push-ups × 10'});
  assert.deepEqual(r, {approved: true, verdict: 'Looks like push-ups.', status: 'approved', museUsed: true});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.meta.ai/v1/responses');
  assert.deepEqual(calls[0].body, {
    model: 'muse-ember-1.0',
    reasoning: {effort: 'minimal'},
    max_output_tokens: 800,
    input: [{role: 'user', content: [
      {type: 'input_text', text: 'Does this photo plausibly show someone doing or having just done: "push-ups × 10"? Describe only what is visible. Never comment on the person\'s body, looks, age or health. Reply as JSON {"approved": boolean, "verdict": string (max 12 words)}.'},
      {type: 'input_image', image_url: IMG, detail: 'low'},
    ]}],
    text: {format: {type: 'json_schema', name: 'proof', strict: true, schema: {type: 'object', properties: {approved: {type: 'boolean'}, verdict: {type: 'string'}}, required: ['approved', 'verdict'], additionalProperties: false}}},
  });
});

test('GLIMMER_PROOF_URL unset and Muse offline: pending, no network', async () => {
  delete process.env.MODEL_API_KEY;
  const r = await verifyProofImage({image: IMG, task: 'squats'});
  assert.equal(r.status, 'pending');
  assert.equal(r.approved, false);
  assert.equal(calls.length, 0);
});

test('GLIMMER_PROOF_URL set but glimmer not requested (photo proof): Ember only', async () => {
  process.env.GLIMMER_PROOF_URL = 'https://glimmer.test/v1';
  ember = emberSays(true, 'Run screen shown.');
  assert.equal((await verifyProofImage({image: IMG, task: 'run 5 km'})).status, 'approved');
  assert.deepEqual(calls.map(c => c.url), ['https://api.meta.ai/v1/responses']);
});

const G = {glimmer: true};

test('Glimmer answers: request shape and ok/rejected/unclear mapping', async () => {
  process.env.GLIMMER_PROOF_URL = 'https://glimmer.test/v1/';
  process.env.GLIMMER_PROOF_KEY = 'gk';
  glimmer = glimmerSays(check({}));
  const frames = [IMG, IMG + 'B', IMG + 'C'];
  assert.deepEqual(await verifyProofImage({image: IMG, frames, task: 'push-ups × 10'}, G), {approved: true, verdict: 'Push-ups visible across the frames.', status: 'approved', museUsed: true});
  assert.equal(calls.length, 1);
  const {url, body, headers} = calls[0];
  assert.equal(url, 'https://glimmer.test/v1/chat/completions');
  assert.equal(headers.authorization, 'Bearer gk');
  assert.equal(body.model, 'exercise_check');
  assert.equal(body.temperature, 0);
  assert.deepEqual(body.chat_template_kwargs, {reasoning_strength: 'low'});
  assert.equal((body.response_format as {type: string}).type, 'json_schema');
  const content = (body.messages as {content: {type: string; text?: string; image_url?: {url: string}}[]}[])[0].content;
  assert.match(content[0].text!, /Today's task: "push-ups × 10"/);
  assert.deepEqual(content.slice(1).map(c => c.image_url!.url), frames);

  glimmer = glimmerSays(check({ex: 'squat', match: false, ok: false, why: 'Squats, not push-ups.'}));
  assert.deepEqual(await verifyProofImage({image: IMG, task: 'push-ups'}, G), {approved: false, verdict: 'Squats, not push-ups.', status: 'rejected', museUsed: true});
  glimmer = glimmerSays(check({shows: 'unclear', ex: 'none', match: false, ok: false, why: 'Too dark to tell.'}));
  assert.deepEqual(await verifyProofImage({image: IMG, task: 'push-ups'}, G), {approved: false, verdict: 'Too dark to tell.', status: 'pending', museUsed: true});
  glimmer = glimmerSays(check({shows: 'not_a_workout', ok: true}));
  assert.equal((await verifyProofImage({image: IMG, task: 'push-ups'}, G)).status, 'rejected', 'inconsistent ok never approves');
  assert.ok(calls.every(c => c.url.startsWith('https://glimmer.test/')), 'Ember not called when Glimmer answers');
});

test('Glimmer timeout falls back to Ember', async () => {
  process.env.GLIMMER_PROOF_URL = 'https://glimmer.test/v1';
  process.env.GLIMMER_PROOF_TIMEOUT_MS = '30';
  glimmer = init => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason)));
  ember = emberSays(false, 'No push-ups visible.');
  const r = await verifyProofImage({image: IMG, task: 'push-ups'}, G);
  assert.deepEqual(r, {approved: false, verdict: 'No push-ups visible.', status: 'rejected', museUsed: true});
  assert.deepEqual(calls.map(c => c.url), ['https://glimmer.test/v1/chat/completions', 'https://api.meta.ai/v1/responses']);
});

test('Glimmer invalid JSON falls back to Ember', async () => {
  process.env.GLIMMER_PROOF_URL = 'https://glimmer.test/v1';
  glimmer = () => Promise.resolve(json({choices: [{message: {content: 'not json'}}]}));
  assert.equal((await verifyProofImage({image: IMG, task: 'push-ups'}, G)).status, 'approved');
  assert.equal(calls.length, 2);
});

test('Glimmer and Ember both fail: pending (fail closed)', async () => {
  process.env.GLIMMER_PROOF_URL = 'https://glimmer.test/v1';
  glimmer = () => Promise.resolve(json({error: 'boom'}, 502));
  ember = () => Promise.resolve(json({error: {message: 'bad request'}}, 400)); // 400: the SDK does not retry
  const r = await verifyProofImage({image: IMG, task: 'push-ups'}, G);
  assert.equal(r.status, 'pending');
  assert.equal(r.approved, false);
  assert.equal(r.museUsed, false);
});
