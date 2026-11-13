import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startConnector} from './connector-start.ts';

test('connector start uses the existing API and returns connection or instructions', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  for (const result of [
    {type: 'redirect', url: 'https://www.strava.com/oauth/authorize'},
    {type: 'connected'},
    {type: 'instructions', title: 'Open the native app'},
    {type: 'unavailable', reason: 'Not configured'},
  ]) {
    fetchMock.mock.mockImplementation(async (url, options) => {
      assert.equal(url, '/api/connect/strava/start');
      assert.deepEqual(options, {method: 'POST'});
      return Response.json({result});
    });
    assert.deepEqual(await startConnector('strava'), result);
  }
});

test('connector start reports HTTP, empty, malformed and network failures', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  fetchMock.mock.mockImplementation(async () => new Response(null, {status: 401}));
  await assert.rejects(startConnector('strava'), /Could not start this connection/);
  fetchMock.mock.mockImplementation(async () => Response.json({}));
  await assert.rejects(startConnector('strava'), /returned no result/);
  fetchMock.mock.mockImplementation(async () => new Response('not JSON'));
  await assert.rejects(startConnector('strava'), SyntaxError);
  fetchMock.mock.mockImplementation(async () => { throw new Error('Network unavailable'); });
  await assert.rejects(startConnector('strava'), /Network unavailable/);
});
