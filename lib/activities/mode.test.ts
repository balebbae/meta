import assert from 'node:assert/strict';
import {test} from 'node:test';
import {inActivities} from './mode.ts';

test('Activities mode covers /activities, its sub-routes and the preview, nothing else', () => {
  for (const p of ['/activities', '/activities/', '/activities/goals', '/activities/games/12', '/activities-preview']) assert.equal(inActivities(p), true, p);
  for (const p of ['/', '/messages', '/activity', '/activitiesx', '/activities-previews', '/activities-preview/feed', '/games/2', '/profile/activities']) assert.equal(inActivities(p), false, p);
});
