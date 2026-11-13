import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stravaConnected} from './strava-status.ts';

test('Strava connection state handles connected, empty, revoked and failed responses', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  for (const [connections, expected] of [
    [[{source: 'strava', status: 'connected'}], true],
    [[], false],
    [[{source: 'strava', status: 'pending'}], false],
    [[{source: 'strava', status: 'revoked'}, {source: 'mock', status: 'connected'}], false],
  ] as const) {
    fetchMock.mock.mockImplementation(async () => Response.json({connections}));
    assert.equal(await stravaConnected(), expected);
  }
  fetchMock.mock.mockImplementation(async () => new Response(null, {status: 401}));
  await assert.rejects(stravaConnected, /Could not check Strava connection/);
  fetchMock.mock.mockImplementation(async () => { throw new Error('Network unavailable'); });
  await assert.rejects(stravaConnected, /Network unavailable/);
});
