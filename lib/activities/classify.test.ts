import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {test} from 'node:test';
import vectors from './activity-vectors.json' with {type: 'json'};
import {ACTIVITY_IDS} from './ontology.ts';

const hasModel = existsSync('embed/onnx/rally-embed/onnx/model.onnx');

test('activity vectors cover the ontology, one per activity', () => {
  assert.deepEqual([...vectors.ids].sort(), [...ACTIVITY_IDS].sort());
  assert.equal(new Set(vectors.vectors.map(v => v.length)).size, 1);
});

test('rankActivities returns the top 3 by cosine', async () => {
  const {rankActivities} = await import('./classify.ts');
  const r = rankActivities(vectors.vectors[vectors.ids.indexOf('kayak')]);
  assert.equal(r.length, 3);
  assert.equal(r[0].activity, 'kayak');
  assert.ok(Math.abs(r[0].score - 1) < 1e-3 && r[0].score >= r[1].score && r[1].score >= r[2].score);
});

test('classifyActivity degrades to [] without model files', async () => {
  process.env.RALLY_EMBED_DIR = '/nonexistent';
  const {classifyActivity} = await import('./classify.ts');
  assert.deepEqual(await classifyActivity('Wahoo KICKR smart trainer'), []);
  delete process.env.RALLY_EMBED_DIR;
});

test('classifyActivity maps brand/gear text with the exported model', {skip: !hasModel && 'run python -m rally_embed.export first'}, async () => {
  const {classifyActivity} = await import('./classify.ts');
  const top = await classifyActivity('Zwift race on my smart trainer, 40 min');
  assert.equal(top.length, 3);
  assert.equal(top[0].activity, 'cycle');
  assert.equal((await classifyActivity('kayaked the bay for 2 hours'))[0].activity, 'kayak');
});
