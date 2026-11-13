import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PANEL_KEYS, panelHref} from './panel-href.ts';

test('panelHref builds /activities?panel=… and drops empty values', () => {
  assert.equal(panelHref({panel: 'goals', goal: 3}), '/activities?panel=goals&goal=3');
  assert.equal(panelHref({panel: 'settings', tab: 'sources', source: undefined, error: ''}), '/activities?panel=settings&tab=sources');
  assert.equal(panelHref({panel: 'mentors', offer: null}), '/activities?panel=mentors');
  assert.equal(panelHref({panel: 'settings', tab: 'sources', source: 'strava', connected: '1', imported: '4'}), '/activities?panel=settings&tab=sources&source=strava&connected=1&imported=4');
});

test('closing a panel strips every key the redirects and OAuth callback set', () => {
  for (const k of ['panel', 'tab', 'source', 'goal', 'request', 'offer', 'step', 'invite', 'connected', 'imported', 'error']) assert.ok((PANEL_KEYS as readonly string[]).includes(k), k);
});
