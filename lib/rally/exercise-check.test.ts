import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXERCISES, EXERCISE_CHECK_PROMPT, SHOWS, exerciseCheckPrompt} from './exercise-check.ts';

const py = readFileSync(new URL('../../finetune/rally_ft/tasks/exercise_check.py', import.meta.url), 'utf8');
const pyList = (name: string) => JSON.parse(py.match(new RegExp(`^${name} = (\\[.*\\])$`, 'm'))![1].replace(/'/g, '"'));

test('TS prompt is identical to the Python exercise_check PROMPT', () => {
  assert.equal(EXERCISE_CHECK_PROMPT, py.match(/^PROMPT = """([\s\S]*?)"""/m)![1]);
});

test('schema enums match the Python SHOWS / EXERCISES', () => {
  assert.deepEqual([...SHOWS], pyList('SHOWS'));
  assert.deepEqual([...EXERCISES], pyList('EXERCISES'));
});

test('task text is substituted literally', () => {
  assert.match(exerciseCheckPrompt('push-ups $& × 10'), /Today's task: "push-ups \$& × 10"\./);
});
