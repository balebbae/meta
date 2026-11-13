import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bandValue, friendVisibleTags, xpBand} from './privacy.ts';

test("a friend's only_me / muse_only / dismissed tags never reach Discover", () => {
  const tags = friendVisibleTags([
    {tag: 'Running', visibility: 'friends', confirmed: true},
    {tag: 'Yoga', visibility: 'public', confirmed: true},
    {tag: 'Knee injury', visibility: 'muse_only', confirmed: true},
    {tag: 'Climbing', visibility: 'only_me', confirmed: true},
    {tag: 'Lifting', visibility: 'friends', confirmed: false},
  ]);
  assert.deepEqual(tags, ['Running', 'Yoga']);
});

test('bandValue coarsens mentor records', () => {
  assert.equal(bandValue('29:10'), '28–30 min');
  assert.equal(bandValue('24:40'), '24–26 min');
  assert.equal(bandValue('1:05:00'), '60–70 min');
  assert.equal(bandValue('135 lb'), '100–150 lb');
  assert.equal(bandValue('225 lb'), '200–250 lb');
  assert.equal(bandValue('4'), '4–6');
  assert.equal(bandValue('12.5 km'), '10–15 km');
  assert.equal(bandValue('about a lot'), null);
  assert.equal(bandValue(null), null);
});

test('xpBand hides exact leaderboard XP', () => {
  assert.equal(xpBand(0), '0');
  assert.equal(xpBand(7), '1–24');
  assert.equal(xpBand(73), '50–99');
  assert.equal(xpBand(1200), '1000+');
});
