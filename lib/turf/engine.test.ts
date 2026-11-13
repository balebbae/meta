import assert from 'node:assert/strict';
import {test} from 'node:test';
import {latLngToCell} from 'h3-js';
import {
  applyClaim, arenaCells, cellCenter, detectCut, detectLoop, fastPoints, fillLoop, fmtPace, haversineM, inArena, loopPace, MAX_STEP_MS, obfuscateZone, outingTrimM, paceOk,
  pointsToCells, releasePlayer, score, smoothTrack, TRIM_M, TRIM_MAX_M, TRIM_MIN_M, TURF_RES, type LatLng, type Zone, type Arena, type GpsPoint, type TrailCell,
  type TurfGame,
} from './engine.ts';
import {KATY_TRAIL, scriptGpx, scriptPoints} from './fixtures.ts';
import {parseGpx, parseGpxTrack, tooUntimed} from './gpx.ts';

const arena: Arena = {center: KATY_TRAIL, radiusKm: 1.5};
const M_LAT = 111_320;
const M_LNG = 111_320 * Math.cos((KATY_TRAIL.lat * Math.PI) / 180);
const at = (x: number, y: number, t: number): GpsPoint => ({lat: KATY_TRAIL.lat + y / M_LAT, lng: KATY_TRAIL.lng + x / M_LNG, t});
/** Straight walk from a to b at 3 m/s, a point every 12 m. */
function walk(a: [number, number], b: [number, number], t0 = 0): GpsPoint[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / 12));
  return Array.from({length: n + 1}, (_, i) => at(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, t0 + (i * len * 1000) / n / 3));
}
const empty = (): TurfGame => ({cells: new Map()});

test('arena has roughly 3,000 res-11 cells and all are inside the circle', () => {
  const cells = arenaCells(arena);
  assert.ok(cells.length > 2500 && cells.length < 4500, `got ${cells.length}`);
  assert.ok(cells.every(c => inArena(cellCenter(c), arena)));
});

test('pointsToCells drops points outside the arena', () => {
  const pts = walk([1300, 0], [1900, 0]);
  const cells = pointsToCells(pts, arena, {trimM: 0});
  assert.ok(cells.length > 0);
  assert.ok(cells.every(c => haversineM(cellCenter(c.cell), KATY_TRAIL) <= 1500 + 40));
  assert.equal(pointsToCells(walk([1600, 0], [2200, 0]), arena, {trimM: 0}).length, 0);
});

test('pointsToCells drops privacy-zone points', () => {
  const pts = walk([0, 0], [600, 0]);
  const zone = {...at(300, 0, 0), radiusM: 100};
  const cells = pointsToCells(pts, arena, {trimM: 0, zones: [zone]});
  assert.ok(cells.length > 0);
  assert.ok(cells.every(c => haversineM(cellCenter(c.cell), zone) > 100 - 30));
  assert.ok(cells.length < pointsToCells(pts, arena, {trimM: 0}).length);
});

test('pointsToCells hides the first and last 200 m of an outing', () => {
  const pts = walk([0, 0], [1000, 0]);
  const start = pts[0];
  const end = pts[pts.length - 1];
  const cells = pointsToCells(pts, arena);
  assert.ok(cells.length > 5);
  for (const c of cells) {
    assert.ok(haversineM(cellCenter(c.cell), start) > 200 - 30, 'too close to the start');
    assert.ok(haversineM(cellCenter(c.cell), end) > 200 - 30, 'too close to the end');
  }
  const all = pointsToCells(pts, arena, {keepHidden: true});
  assert.ok(all[0].hidden && all[all.length - 1].hidden);
  assert.equal(pointsToCells(walk([0, 0], [300, 0]), arena).length, 0, 'an outing shorter than 400 m shows nothing');
});

test('pointsToCells drops stretches faster than 25 km/h', () => {
  const slow = walk([0, 0], [300, 0]);
  const t1 = slow[slow.length - 1].t;
  // 300 m in 20 s = 54 km/h
  const car = Array.from({length: 10}, (_, i) => at(300 + (i + 1) * 30, 0, t1 + (i + 1) * 2000));
  const slow2 = walk([600, 12], [900, 12], t1 + 40_000);
  const cells = pointsToCells([...slow, ...car, ...slow2], arena, {trimM: 0});
  // The first and last car points share a cell with the walked stretches on either side.
  const walked = new Set([...slow, ...slow2].map(p => latLngToCell(p.lat, p.lng, TURF_RES)));
  const carCells = new Set(car.map(p => latLngToCell(p.lat, p.lng, TURF_RES)).filter(c => !walked.has(c)));
  assert.ok(carCells.size >= 5);
  assert.ok(cells.length > 8);
  assert.ok(!cells.some(c => carCells.has(c.cell)), 'car stretch leaked into the trail');
});

test('trail cells are ordered, timestamped and continuous for sparse tracks', () => {
  const sparse = [at(0, 0, 0), at(150, 0, 60_000), at(300, 0, 120_000)];
  const cells = pointsToCells(sparse, arena, {trimM: 0});
  assert.ok(cells.length >= 6, `expected interpolated cells, got ${cells.length}`);
  for (let i = 1; i < cells.length; i++) assert.ok(cells[i].t >= cells[i - 1].t);
});

test('detectLoop: closes when the trail ends within 50 m of its start', () => {
  const pts = [...walk([0, 0], [300, 0]), ...walk([300, 0], [300, 300], 100_000), ...walk([300, 300], [0, 300], 200_000), ...walk([0, 300], [0, 0], 300_000)];
  const trail = pointsToCells(pts, arena, {keepHidden: true});
  const loop = detectLoop(trail, new Set());
  assert.equal(loop.closed, true);
  assert.equal(loop.reason, 'start');
  const open = detectLoop(pointsToCells(pts.slice(0, Math.floor(pts.length * 0.7)), arena, {keepHidden: true}), new Set());
  assert.equal(open.closed, false);
});

test('detectLoop: closes when the trail re-enters own territory', () => {
  const owned = new Set(pointsToCells(walk([0, -40], [0, 40]), arena, {trimM: 0}).map(c => c.cell));
  const pts = [...walk([0, 0], [250, 0]), ...walk([250, 0], [250, 250], 100_000), ...walk([250, 250], [0, 0], 200_000)];
  const trail = pointsToCells(pts, arena, {trimM: 0});
  const loop = detectLoop(trail, owned);
  assert.equal(loop.closed, true);
  assert.equal(loop.reason, 'territory');
  assert.ok(loop.loop.every(c => !owned.has(c.cell)));
  assert.equal(detectLoop(trail.slice(0, 6), owned).closed, false);
});

test('fillLoop returns the trail and every cell inside it', () => {
  const pts = [...walk([0, 0], [300, 0]), ...walk([300, 0], [300, 300], 100_000), ...walk([300, 300], [0, 300], 200_000), ...walk([0, 300], [0, 0], 300_000)];
  const trail = pointsToCells(pts, arena, {trimM: 0});
  const filled = fillLoop(trail, arena);
  const inside = latLngToCell(at(150, 150, 0).lat, at(150, 150, 0).lng, TURF_RES);
  const outside = latLngToCell(at(-150, 150, 0).lat, at(-150, 150, 0).lng, TURF_RES);
  assert.ok(filled.includes(inside));
  assert.ok(!filled.includes(outside));
  assert.ok(filled.length > new Set(trail.map(c => c.cell)).size);
  // 300 m x 300 m at ~2,000 m2 per cell
  assert.ok(filled.length > 30 && filled.length < 70, `got ${filled.length}`);
});

test('fillLoop falls back to the trail for a degenerate polygon', () => {
  const out = pointsToCells(walk([0, 0], [300, 0]), arena, {trimM: 0});
  const back = [...out].reverse();
  const cells = fillLoop([...out, ...back]);
  assert.deepEqual(new Set(cells), new Set(out.map(c => c.cell)));
  assert.deepEqual(fillLoop(['8b26cb0a0001fff', '8b26cb0a0001fff']), ['8b26cb0a0001fff']);
});

test('fillLoop never claims a hidden cell as trail', () => {
  const trail: TrailCell[] = pointsToCells(scriptPoints('sarah_cut'), arena, {keepHidden: true});
  const visible = trail.filter(c => !c.hidden);
  const hiddenOnly = trail.filter(c => c.hidden && !visible.some(v => v.cell === c.cell)).map(c => c.cell);
  assert.ok(hiddenOnly.length > 0);
  assert.deepEqual(new Set(fillLoop(trail, arena)), new Set(fillLoop(visible, arena)));
});

test('applyClaim takes cells from other owners and reports what was taken', () => {
  let game = empty();
  game = applyClaim(game, 1, ['a', 'b', 'c'], 10).game;
  const r = applyClaim(game, 2, ['b', 'c', 'd', 'd'], 20);
  assert.equal(r.gained, 3);
  assert.deepEqual(r.taken, {1: 2});
  assert.equal(r.game.cells.get('b')?.owner, 2);
  assert.equal(game.cells.get('b')?.owner, 1, 'input game must not be mutated');
  assert.equal(applyClaim(r.game, 2, ['b'], 30).gained, 0);
});

test('releasePlayer turns a leaver cells neutral', () => {
  const game = applyClaim(applyClaim(empty(), 1, ['a', 'b'], 1).game, 2, ['c'], 2).game;
  const next = releasePlayer(game, 1);
  assert.deepEqual([...next.cells.keys()], ['c']);
});

test('detectCut: crossing an open trail after it was laid is a cut', () => {
  const victim = {userId: 1, trail: [{cell: 'a', t: 10}, {cell: 'b', t: 20}, {cell: 'c', t: 30}]};
  assert.deepEqual(detectCut(victim, {userId: 2, trail: [{cell: 'x', t: 25}, {cell: 'b', t: 40}]}), {cell: 'b', t: 40, victimId: 1, cutterId: 2});
  assert.equal(detectCut(victim, {userId: 2, trail: [{cell: 'b', t: 5}]}), null, 'there before the trail was laid');
  assert.equal(detectCut(victim, {userId: 2, trail: [{cell: 'z', t: 40}]}), null, 'no shared cell');
  assert.equal(detectCut(victim, {userId: 1, trail: [{cell: 'b', t: 40}]}), null, 'own trail');
  assert.equal(detectCut({...victim, endedAt: 35}, {userId: 2, trail: [{cell: 'b', t: 40}]}), null, 'outing already over');
  assert.equal(detectCut({userId: 1, trail: [{cell: 'b', t: 20, hidden: true}]}, {userId: 2, trail: [{cell: 'b', t: 40}]}), null, 'hidden cells are not in the game');
});

test('score: most cells wins, ties go to who reached the count first', () => {
  let game = empty();
  game = applyClaim(game, 1, ['a', 'b'], 100).game;
  game = applyClaim(game, 2, ['c', 'd'], 50).game;
  game = applyClaim(game, 3, ['e'], 10).game;
  const s = score(game, [1, 2, 3, 4]);
  assert.deepEqual(s.map(x => x.playerId), [2, 1, 3, 4]);
  assert.deepEqual(s.map(x => x.rank), [1, 2, 3, 4]);
  assert.equal(s[3].cells, 0);
});

test('GPX round trip gives the same trail as the points', () => {
  const pts = scriptPoints('priya_loop', KATY_TRAIL, Date.UTC(2026, 10, 12, 15));
  const parsed = parseGpx(scriptGpx('priya_loop', KATY_TRAIL, Date.UTC(2026, 10, 12, 15)));
  assert.equal(parsed.length, pts.length);
  assert.deepEqual(pointsToCells(parsed, arena).map(c => c.cell), pointsToCells(pts, arena).map(c => c.cell));
  assert.equal(parseGpx('<gpx><trk><trkseg><trkpt lat="32.81" lon="-96.79"/><trkpt lat="32.811" lon="-96.79"/></trkseg></trk></gpx>', 1000).length, 2);
});

test('stage demo: Priya closes a base, Sarah cuts her open trail and takes 14 cells', () => {
  let game = empty();
  // Priya (2)
  const priya = pointsToCells(scriptPoints('priya_loop', KATY_TRAIL, 0), arena, {keepHidden: true});
  const loopP = detectLoop(priya, new Set());
  assert.equal(loopP.closed, true);
  assert.equal(loopP.reason, 'start');
  const claimP = applyClaim(game, 2, fillLoop(loopP.loop, arena), 1);
  game = claimP.game;
  assert.ok(claimP.gained >= 40 && claimP.gained <= 80, `Priya base: ${claimP.gained}`);
  const openTrail = priya.slice(loopP.endIndex + 1);
  assert.ok(openTrail.filter(c => !c.hidden).length > 5, 'Priya leaves an open trail');
  assert.equal(detectLoop(openTrail, new Set(claimP.changed)).closed, false);

  // Sarah (1) starts after Priya
  const t0 = priya[priya.length - 1].t + 1000;
  const sarah = pointsToCells(scriptPoints('sarah_cut', KATY_TRAIL, t0), arena, {keepHidden: true});
  const cut = detectCut({userId: 2, trail: openTrail}, {userId: 1, trail: sarah});
  assert.ok(cut, 'Sarah crosses Priya open trail');
  assert.equal(detectCut({userId: 1, trail: sarah}, {userId: 2, trail: openTrail}), null, 'Priya did not cut Sarah');
  const loopS = detectLoop(sarah, new Set());
  assert.equal(loopS.closed, true);
  const claimS = applyClaim(game, 1, fillLoop(loopS.loop, arena), 2);
  assert.equal(claimS.taken[2], 14, `Sarah took ${claimS.taken[2]} of Priya's cells`);
  const s = score(claimS.game, [1, 2]);
  assert.equal(s[0].cells + s[1].cells, claimS.game.cells.size);
});

/** Seeded uniform [0, 1) so the attack simulation is reproducible. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** Attacker: least-squares (Kasa) circle through the first visible cell of every outing; returns the centre in local metres. */
function fitCircle(pts: [number, number][]): [number, number] {
  // solve [x y 1] . [a b c] = x^2 + y^2 via 3x3 normal equations; centre = (a/2, b/2)
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const v = [0, 0, 0];
  for (const [x, y] of pts) {
    const row = [x, y, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j];
      v[i] += row[i] * (x * x + y * y);
    }
  }
  for (let i = 0; i < 3; i++) {
    for (let k = i + 1; k < 3; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < 3; j++) A[k][j] -= f * A[i][j];
      v[k] -= f * v[i];
    }
  }
  const s = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let acc = v[i];
    for (let j = i + 1; j < 3; j++) acc -= A[i][j] * s[j];
    s[i] = acc / A[i][i];
  }
  return [s[0] / 2, s[1] / 2];
}

const local = (p: LatLng): [number, number] => [(p.lng - KATY_TRAIL.lng) * M_LNG, (p.lat - KATY_TRAIL.lat) * M_LAT];

/** N outings leave home in random directions; the attacker sees only the cells pointsToCells keeps. */
function attack(zone: Zone, trimFor: (i: number) => number, rand: () => number, n = 40): [number, number] {
  const firsts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * rand();
    const cells = pointsToCells(walk([0, 0], [1200 * Math.cos(a), 1200 * Math.sin(a)]), arena, {zones: [zone], trimM: trimFor(i)});
    if (cells.length) firsts.push(local(cellCenter(cells[0].cell)));
  }
  return fitCircle(firsts);
}

test('zone-centre attack: exact zone + fixed trim leaks home, obfuscated zone + per-outing trim does not', () => {
  const home: Zone = {...KATY_TRAIL, radiusM: 200};
  const before: number[] = [];
  const after: number[] = [];
  const offsets: number[] = [];
  for (let trial = 0; trial < 12; trial++) {
    const rand = rng(1000 + trial);
    before.push(Math.hypot(...attack(home, () => TRIM_M, rand)));
    const z = obfuscateZone(home, rand(), rand());
    const [cx, cy] = attack(z, i => outingTrimM(`${trial}:${i}`), rand);
    offsets.push(haversineM(z, home));
    after.push(Math.hypot(cx, cy));
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(`zone attack: before mean ${mean(before).toFixed(1)} m (max ${Math.max(...before).toFixed(1)}), after mean ${mean(after).toFixed(1)} m vs mean offset ${mean(offsets).toFixed(1)} m`);
  assert.ok(Math.max(...before) < 10, `before: ${before}`);
  assert.ok(mean(after) >= 0.8 * mean(offsets) && mean(after) > 200 / 4, `after: ${after}`);
});

test('obfuscated zone still covers every point of the original circle', () => {
  const rand = rng(7);
  for (let i = 0; i < 200; i++) {
    const z = {...KATY_TRAIL, radiusM: 50 + Math.round(rand() * 950)};
    const o = obfuscateZone(z, rand(), rand());
    assert.equal(o.radiusM, Math.round(z.radiusM * 1.5));
    assert.ok(haversineM(o, z) <= z.radiusM / 2 + 0.5);
    const a = 2 * Math.PI * rand();
    const edge = {lat: z.lat + (z.radiusM * Math.sin(a)) / M_LAT, lng: z.lng + (z.radiusM * Math.cos(a)) / M_LNG};
    assert.ok(haversineM(edge, o) <= o.radiusM, 'original edge point left uncovered');
  }
});

test('outingTrimM is stable per outing and spans 150-400 m', () => {
  const trims = Array.from({length: 500}, (_, i) => outingTrimM(i));
  assert.equal(outingTrimM(42), outingTrimM(42));
  assert.ok(trims.every(t => t >= TRIM_MIN_M && t < TRIM_MAX_M));
  assert.ok(Math.min(...trims) < 170 && Math.max(...trims) > 380);
});

test('pointsToCells hides the trim distance after leaving a zone mid-outing', () => {
  const zone = {...at(500, 0, 0), radiusM: 100};
  const cells = pointsToCells(walk([0, 0], [1200, 0]), arena, {trimM: 150, zones: [zone]});
  // visible: [150, 250) before the zone, and from 600 + 150 = 750 to 1200 - 150
  assert.ok(cells.every(c => {
    const x = local(cellCenter(c.cell))[0];
    return (x > 120 && x < 280) || (x > 720 && x < 1080);
  }), `${cells.map(c => local(cellCenter(c.cell))[0].toFixed(0))}`);
});

test('untimed GPX is refused for territory claims, timed GPX is accepted', () => {
  const untimed = parseGpxTrack('<gpx><trk><trkseg><trkpt lat="32.81" lon="-96.79"/><trkpt lat="32.811" lon="-96.79"/><trkpt lat="32.812" lon="-96.79"/></trkseg></trk></gpx>', 1000);
  assert.equal(untimed.untimed, 3);
  assert.equal(tooUntimed(untimed), true);
  const timed = parseGpxTrack(scriptGpx('priya_loop', KATY_TRAIL, Date.UTC(2026, 10, 12, 15)));
  assert.equal(timed.untimed, 0);
  assert.equal(tooUntimed(timed), false);
});

/** 1 Hz walk at `slow` m/s along y = 0 with a `fast` m/s stretch from 180 s to 240 s. */
function stepTrack(slow: number, fast: number): GpsPoint[] {
  let x = -600;
  return Array.from({length: 421}, (_, t) => at((x += t === 0 ? 0 : t > 180 && t <= 240 ? fast : slow), 0, t * 1000));
}
const share = (f: boolean[], from: number, to: number) => f.slice(from, to).filter(Boolean).length / (to - from);

test('sustained jump: a minute in a car at 20 km/h inside a walk is dropped, even under 20 m jitter', () => {
  // Under the 25 km/h cap, so only the jump bound catches it. The old fix-to-fix bound (5 m/s^2) missed it on a clean track.
  const car = stepTrack(1.4, 5.6);
  const clean = fastPoints(car);
  assert.equal(share(clean, 181, 241), 1);
  assert.equal(share(clean, 0, 150) + share(clean, 272, 421), 0, 'walk kept');
  const noisy = fastPoints(jitter(car, 20, rng(4)));
  assert.ok(share(noisy, 181, 241) > 0.8, `${share(noisy, 181, 241)}`);
  assert.ok(share(noisy, 0, 150) + share(noisy, 272, 421) < 0.02);
});

test('teleports and vehicles are still flagged; honest noisy 1 Hz runs are not', () => {
  const walkPts = walk([0, 0], [600, 0]).map((p, i) => ({...p, t: i * 1000}));
  const tele = walkPts.map((p, i) => (i === 25 ? at(300, 300, p.t) : p));
  assert.ok(fastPoints(tele)[25], 'a fix 300 m off the track');
  // jitter that defeated the old fix-to-fix bound: intervals and an out-and-back keep every point
  const r = rng(8);
  assert.ok(!fastPoints(jitter(stepTrack(2.5, 4.5), 20, r)).some(Boolean), 'jog -> fast interval');
  const back = Array.from({length: 361}, (_, t) => at(-700 + 4 * (t <= 180 ? t : 360 - t), 0, t * 1000));
  assert.ok(!fastPoints(jitter(back, 20, r)).some(Boolean), 'out-and-back');
  const loop1hz = scriptPoints('priya_loop').flatMap((p, i, a) => (i ? [0.25, 0.5, 0.75, 1].map(f => ({lat: a[i - 1].lat + (p.lat - a[i - 1].lat) * f, lng: a[i - 1].lng + (p.lng - a[i - 1].lng) * f, t: a[i - 1].t + (p.t - a[i - 1].t) * f})) : [p]));
  for (const sigma of [5, 10, 15, 20]) assert.ok(share(fastPoints(jitter(loop1hz, sigma, r)), 0, loop1hz.length) < 0.02, `sigma ${sigma}`);
  const short = Array.from({length: 61}, (_, t) => at(5 * t, 0, t * 1000));
  assert.ok(!fastPoints(short).some(Boolean), 'a 1-minute fast run has no pace to compare with');
  assert.ok(MAX_STEP_MS <= 3.5);
});

const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const jitter = (pts: GpsPoint[], s: number, r: () => number) => pts.map(p => ({lat: p.lat + (s * gauss(r)) / M_LAT, lng: p.lng + (s * gauss(r)) / M_LNG, t: p.t}));

test('smoothTrack leaves a clean constant-speed line in place and pulls jitter back toward it', () => {
  const line = walk([0, 0], [600, 0]);
  assert.ok(smoothTrack(line).every((p, i) => haversineM(p, line[i]) < 0.5));
  const noisy = jitter(line, 10, rng(3));
  const rms = (ps: LatLng[]) => Math.sqrt(ps.reduce((a, p, i) => a + haversineM(p, line[i]) ** 2, 0) / ps.length);
  assert.ok(rms(smoothTrack(noisy)) < 0.6 * rms(noisy), `${rms(smoothTrack(noisy))} vs ${rms(noisy)}`);
});

test('Kalman/RTS smoothing: fewer spurious zig-zag cells and better loop closure on noisy tracks', () => {
  const clean = scriptPoints('priya_loop');
  const truth = new Set(pointsToCells(clean, arena, {trimM: 0, smoothM: 0}).map(c => c.cell));
  const truthFill = new Set(fillLoop(detectLoop(pointsToCells(clean, arena, {keepHidden: true, smoothM: 0}), new Set()).loop, arena));
  for (const sigma of [5, 10, 15, 20]) {
    const m = [0, 10].map(smoothM => {
      const r = rng(sigma);
      let spurious = 0, zigzag = 0, closed = 0, jaccard = 0;
      const N = 20;
      for (let k = 0; k < N; k++) {
        const pts = jitter(clean, sigma, r);
        const trail = pointsToCells(pts, arena, {trimM: 0, smoothM});
        spurious += trail.filter(c => !truth.has(c.cell)).length;
        for (let i = 2; i < trail.length; i++) if (trail[i].cell === trail[i - 2].cell) zigzag++;
        const loop = detectLoop(pointsToCells(pts, arena, {keepHidden: true, smoothM}), new Set());
        if (!loop.closed || loop.reason !== 'start') continue;
        closed++;
        const f = new Set(fillLoop(loop.loop, arena));
        const inter = [...f].filter(c => truthFill.has(c)).length;
        jaccard += inter / (f.size + truthFill.size - inter);
      }
      return {spurious: spurious / N, zigzag: zigzag / N, closed, jaccard: jaccard / Math.max(1, closed)};
    });
    const f = (x: (typeof m)[0]) => `spurious ${x.spurious.toFixed(1)} zigzag ${x.zigzag.toFixed(1)} closed ${x.closed}/20 jaccard ${x.jaccard.toFixed(3)}`;
    console.log(`smoothing sigma ${sigma} m: before ${f(m[0])} | after ${f(m[1])}`);
    assert.ok(m[1].spurious < m[0].spurious, `spurious sigma ${sigma}`);
    assert.ok(m[1].zigzag <= 0.7 * m[0].zigzag, `zigzag sigma ${sigma}`);
    assert.ok(m[1].closed >= m[0].closed - 1 && m[1].jaccard >= m[0].jaccard - 0.005, `loop sigma ${sigma}`);
  }
});

test('smoothing never moves a visible cell into a privacy zone or toward a hidden end', () => {
  const zone = {...at(500, 0, 0), radiusM: 100};
  const r = rng(11);
  for (let k = 0; k < 20; k++) {
    // through the zone, and skirting its edge 5 m outside
    for (const track of [walk([0, 0], [1200, 0]), walk([300, 105], [700, 105])]) {
      const noisy = jitter(track, 12, r);
      const raw = pointsToCells(noisy, arena, {trimM: 150, zones: [zone], keepHidden: true, smoothM: 0});
      const smooth = pointsToCells(noisy, arena, {trimM: 150, zones: [zone], keepHidden: true});
      for (const c of smooth.filter(c => !c.hidden)) assert.ok(haversineM(cellCenter(c.cell), zone) > zone.radiusM - 30, 'visible cell inside the zone');
      // hidden/visible is decided per raw point, so smoothing brings no visible cell closer to the zone, start or end than ~1 cell
      const vis = (cs: TrailCell[]) => cs.filter(c => !c.hidden).map(c => cellCenter(c.cell));
      const [rv, sv] = [vis(raw), vis(smooth)];
      if (!sv.length) continue;
      assert.ok(rv.length, 'smoothing showed an outing the raw trim hid');
      for (const anchor of [zone, track[0], track[track.length - 1]]) {
        const near = (cs: LatLng[]) => Math.min(...cs.map(c => haversineM(c, anchor)));
        assert.ok(near(sv) > near(rv) - 30, `smoothed ${near(sv).toFixed(0)} m vs raw ${near(rv).toFixed(0)} m`);
      }
    }
  }
});

test('loopPace: a paced game judges a loop by distance over time, and paceOk allows 5% slack', () => {
  // 1 km due north in a straight line, one point every 5 s
  const line = (secPerKm: number): GpsPoint[] => Array.from({length: 41}, (_, i) => ({lat: KATY_TRAIL.lat + (i * 25) / 111_320, lng: KATY_TRAIL.lng, t: Math.round(i * 25 * secPerKm)}));
  const quick = loopPace(line(300), 0, Infinity)!;
  assert.ok(Math.abs(quick.km - 1) < 0.03, `km ${quick.km}`);
  assert.ok(Math.abs(quick.secPerKm - 300) < 12, `pace ${quick.secPerKm}`);
  assert.equal(paceOk(quick.secPerKm, 330), true); // a 5:30 game, run at 5:00
  assert.equal(paceOk(loopPace(line(714), 0, Infinity)!.secPerKm, 330), false); // walked: does not count
  assert.equal(paceOk(340, 330), true); assert.equal(paceOk(350, 330), false); // 3% slow passes, 6% does not
  assert.equal(loopPace(line(300).slice(0, 3), 0, Infinity), null); // 50 m is too little to judge
  assert.equal(loopPace(line(300), 0, 20_000), null); // so is 20 s
  assert.equal(fmtPace(330), '5:30'); assert.equal(fmtPace(298), '4:58');
});
