import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isFitnessText, tagsForText} from './keywords.ts';

test('keyword tagger matches whole words, not substrings', () => {
  assert.deepEqual(tagsForText('Pride parade'), []);
  assert.deepEqual(tagsForText('Sunday brunch club'), []);
  assert.equal(isFitnessText('Pride brunch'), false);
  assert.deepEqual(tagsForText('Morning Runners 5K'), ['Running']);
  assert.deepEqual(tagsForText('Saturday group rides'), ['Cycling']);
  assert.deepEqual(tagsForText('Trail running & hiking'), ['Running', 'Hiking']);
  assert.deepEqual(tagsForText('Swimming laps'), ['Swimming']);
  assert.equal(isFitnessText('Boss Fight IRL'), true);
});
