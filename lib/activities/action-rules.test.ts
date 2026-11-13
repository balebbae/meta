import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cleanActions, fallbackActions, safeUrl, type Candidate, type RawAction} from './action-rules.ts';

const now = new Date('2026-11-12T12:00:00Z');
const candidates: Candidate[] = [
  {candidateId: 'event:7', kind: 'event', title: 'Katy Trail 5k', detail: 'Sat · Katy Trail', price: 'Free', url: '/events?id=7', imageUrl: 'https://images.unsplash.com/x', startsAt: '2026-11-20T15:00:00.000Z', eventId: 7, listingId: null},
  {candidateId: 'listing:3', kind: 'buy', title: 'Trail shoes', detail: 'Used · Dallas, TX', price: '$65', url: '/marketplace/3', imageUrl: null, startsAt: null, eventId: null, listingId: 3},
];
const web = (over: Partial<RawAction>): RawAction => ({kind: 'event', title: 'Bigfoot Classic Half', detail: 'Jan 16 · Dallas', price: '$55', url: 'https://www.example.com/races/bigfoot/', startsAt: '2027-01-16', why: 'You run three times a week.', candidateId: '', ...over});

test('safeUrl keeps https pages only', () => {
  assert.equal(safeUrl('https://runsignup.com/Race/TX/Dallas#top'), 'https://runsignup.com/Race/TX/Dallas');
  assert.equal(safeUrl('https://www.rei.com/p?sku=1&irclickid=&cm_mmc=aff&utm_source=x'), 'https://www.rei.com/p?sku=1');
  for (const bad of ['http://x.com/a', 'javascript:alert(1)', '/events', 'https://localhost/x', '']) assert.equal(safeUrl(bad), null, bad);
});

test('candidates take ids, links and titles from our rows, never from the model', () => {
  const [a] = cleanActions([web({candidateId: 'event:7', title: 'Injected', url: 'https://evil.example/x'})], candidates, now);
  assert.deepEqual([a.title, a.url, a.eventId, a.dedupeKey], ['Katy Trail 5k', '/events?id=7', 7, 'event:7']);
});

test('unknown or mismatched candidates, bad links and past events are dropped', () => {
  const out = cleanActions(
    [web({candidateId: 'event:999'}), web({candidateId: 'listing:3'}), web({url: 'http://insecure.example/race'}), web({startsAt: '2026-01-01'}), web({kind: 'ad'}), web({title: '  '})],
    candidates,
    now,
  );
  assert.equal(out.length, 0);
});

test('web finds are deduped by page and capped per kind', () => {
  const out = cleanActions(
    [web({}), web({url: 'https://example.com/races/bigfoot'}), web({url: 'https://example.com/a'}), web({url: 'https://example.com/b'}), web({url: 'https://example.com/c'}), web({kind: 'buy', url: 'https://shop.example.com/shoe', startsAt: ''})],
    candidates,
    now,
  );
  assert.deepEqual(out.map(a => a.kind), ['event', 'event', 'event', 'buy']);
  assert.equal(out[0].dedupeKey, 'event:example.com/races/bigfoot');
  assert.equal(out[3].startsAt, null);
  assert.equal(out[0].price, '$55');
  assert.equal(out[0].startsAt, '2027-01-16T12:00:00.000Z');
  assert.equal(cleanActions([web({price: '$180.00 Half Marathon, $200.00 Full Marathon'})], [], now)[0].price, '$180');
  assert.equal(cleanActions([web({price: 'see site'})], [], now)[0].price, null);
});

test('fallback turns candidates into actions with a template reason', () => {
  const out = fallbackActions(candidates);
  assert.deepEqual(out.map(a => a.dedupeKey), ['event:7', 'listing:3']);
  assert.ok(out.every(a => a.why));
});
