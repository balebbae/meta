import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupScore, rankGroups} from './group-match.ts';

const groups = [
  {id: 1, name: 'UT Dallas Computer Science', description: 'Students, alumni and faculty of UTD CS.'},
  {id: 6, name: 'Texas Climbing Community', description: 'Indoor and outdoor climbing across Texas.'},
  {id: 7, name: 'DFW Run Club', description: 'Group runs, 5Ks and trail meetups around Dallas.'},
];

test('a 5K run ranks the run club first, climbing next (fitness), CS not suggested', () => {
  const ranked = rankGroups('Katy Trail 5K: run 5 km together this Saturday', groups);
  assert.deepEqual(ranked.map(g => g.id), [7, 6, 1]);
  assert.equal(ranked[2].score, 0);
});

test('non-fitness text still marks fitness groups, never unrelated ones', () => {
  assert.equal(groupScore('Plank Goblin Week', groups[0]), 0);
  assert.ok(groupScore('Bouldering night', groups[1]) > groupScore('Bouldering night', groups[2]));
});
