import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aheadFit, eventLoad, ewma, levelValue, loadSeries, rampGrowth, scrubContact, targetFor, trajectoryFit, weeklyLoads, workoutsPerWeek} from './ahead.ts';
import {generateDemoHistory, generateDemoWeek} from './demo-week.ts';
import {bandOf} from '../rally/fairness.ts';

test('levelValue reads Answers values', () => {
  assert.equal(levelValue('about 12 km'), 12);
  assert.equal(levelValue('under 1 km'), 0.5);
  assert.equal(levelValue('3-4'), 3.5);
  assert.equal(levelValue('5+'), 5.5);
  assert.equal(levelValue('0'), 0);
  assert.equal(levelValue(7), 7);
  assert.equal(levelValue(true), null);
  assert.equal(levelValue(null), null);
});

test('a beginner (5 km, 2 days) matches someone on their 12-week ramp, not someone at 60 km or behind', () => {
  const me = {km: 5, days: 2};
  assert.deepEqual(targetFor(me), {km: 23, days: 4});
  const near = aheadFit(me, {km: 23, days: null});
  assert.equal(near?.metric, 'km');
  assert.equal(near?.fit, 1);
  assert.equal(aheadFit(me, {km: 60, days: null}), null);
  assert.equal(aheadFit(me, {km: 4, days: 1.5}), null);
});

test('no data yet: someone active 3-4 days a week is a fit', () => {
  const fit = aheadFit({km: null, days: null}, {km: null, days: 3.5});
  assert.equal(fit?.metric, 'days');
  assert.ok((fit?.fit ?? 0) > 0.8);
});

test('scrubContact strips contact details but keeps the message', () => {
  const out = scrubContact('text me at 214-555-0199 or jo.runner@gmail.com, insta @jo_runs, strava.com/athletes/1 — easy pace!');
  assert.ok(!/214|gmail|jo_runs|strava\.com/.test(out), out);
  assert.match(out, /easy pace!/);
  assert.equal(scrubContact('run 3 x 5 km at 6:30/km'), 'run 3 x 5 km at 6:30/km');
});

const DAY = 86_400_000;

test('load is ontology MET-minutes: 30 min at 10 km/h is 30 × 9.3; steps/sleep carry none', () => {
  assert.equal(eventLoad({kind: 'run', startedAt: '', durationMin: 30, distanceKm: 5}), 279);
  assert.equal(eventLoad({kind: 'strength', startedAt: '', durationMin: 40}), 140);
  assert.equal(eventLoad({kind: 'sleep', startedAt: '', durationMin: 480}), 0);
  const now = Date.UTC(2026, 10, 9, 12);
  const at = (d: number) => new Date(now - d * DAY).toISOString();
  assert.deepEqual(weeklyLoads([{kind: 'strength', startedAt: at(1), durationMin: 40}, {kind: 'strength', startedAt: at(9), durationMin: 20}], 3, now), [0, 70, 140]);
});

test('EWMA smooths a one-off spike instead of reading one 7-day snapshot', () => {
  assert.equal(ewma([]), 0);
  assert.equal(ewma([500, 500, 500]), 500);
  const spiky = ewma([500, 500, 500, 2000]);
  assert.ok(spiky > 500 && spiky < 1200, String(spiky));
});

test('ramp: ACWR 1.3 ≈ +12%/week for newer people, less headroom when already strong', () => {
  assert.equal(rampGrowth(0), 1);
  assert.ok(Math.abs(rampGrowth(2) / rampGrowth(1) - 1.12) < 1e-9);
  assert.ok(rampGrowth(12, 'new') > rampGrowth(12, 'regular'));
  assert.ok(rampGrowth(12, 'regular') > rampGrowth(12, 'strong'));
  assert.ok(rampGrowth(12, 'strong') > 1.5 && rampGrowth(12, 'new') < 5);
});

test('past-state matching picks the mentor who trained like me ~offer.weeks ago, on the demo seed histories', () => {
  const now = new Date();
  const series = (u: number) => weeklyLoads([...(u <= 6 ? generateDemoWeek(u, 'mock', now) : []), ...generateDemoHistory(u, 'mock', now)], 16, now.getTime());
  // mentors only answer at 'rounded' (nearest 100 MET-min), exactly what answers.ts hands out
  const rounded = (u: number) => loadSeries(series(u).map(x => Math.round(x / 100) * 100).join(','))!;
  const offers: Record<number, number> = {3: 16, 4: 10, 5: 12, 6: 14, 8: 8, 10: 16};
  for (const tier of ['regular', 'strong']) {
    const fits = Object.entries(offers).map(([m, w]) => ({m: Number(m), f: trajectoryFit(series(1), rounded(Number(m)), w, tier)}));
    const ranked = fits.filter(x => x.f).sort((a, b) => b.f!.fit - a.f!.fit).map(x => x.m);
    assert.equal(ranked[0], 6, `${tier}: ${JSON.stringify(fits)}`);
    assert.ok(ranked.length >= 3, 'enough matches for MENTOR_K');
    // already far ahead (5) or never climbed (3): no trajectory, so matchMentors falls back to aheadFit
    assert.ok(!ranked.includes(5) && !ranked.includes(3));
  }
  assert.equal(trajectoryFit([0, 0, 0, 0], rounded(6), 12), null, 'no history -> fallback');
  assert.equal(trajectoryFit(series(1), [100, 200, 300], 12), null, 'too short -> fallback');
});

test('Rally handicap on a Monday morning: rolling 4 weeks, not Monday-to-now, so a regular is not band 0', () => {
  const monday = new Date(2026, 10, 9, 0, 30).getTime(); // Mon 9 Nov 2026, 00:30
  const workouts = [1, 3, 5, 8, 10, 12, 15, 19, 22, 26].map(d => ({startedAt: new Date(monday - d * DAY + 3_600_000).toISOString()}));
  const sinceMonday = workouts.filter(e => new Date(e.startedAt).getTime() >= new Date(2026, 10, 9).getTime()).length;
  assert.equal(sinceMonday, 0); // the old workouts_this_week reading
  const perWeek = workoutsPerWeek(workouts, monday);
  assert.equal(perWeek, 2.5);
  assert.equal(bandOf({question: 'workouts_per_week_4w', value: perWeek, level: 'exact', sourceTrust: null, withheld: false}), 2);
  assert.equal(bandOf({question: 'workouts_per_week_4w', value: '1-2', level: 'rounded', sourceTrust: null, withheld: false}), 1);
});

test('privacy: matchMentors reads other people only through ask(), at the mentor_match audience', () => {
  const src = readFileSync(new URL('./discover.ts', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export async function matchMentors'));
  assert.ok(!/vault_events|listVaultEvents|museContext/.test(body));
  const asks = [...body.matchAll(/ask\((\w+), '(\w+)'/g)].map(m => [m[1], m[2]]);
  assert.ok(asks.some(([, q]) => q === 'mentor_match'));
  for (const [who, audience] of asks) assert.equal(audience, who === 'seekerId' ? 'only_me' : 'mentor_match');
  assert.ok(!/from '[^']*(db|vault|answers)(\.ts)?'/.test(readFileSync(new URL('./ahead.ts', import.meta.url), 'utf8')), 'ahead.ts stays pure');
});
