import {test} from 'node:test';
import assert from 'node:assert/strict';
import {angleFrame, gradeRoutine, jointHits, MATCH_AT, playable, pointFrame, poseScore, targetFor, validPoses, validReference, type AngleFrame, type PoseLandmark, type Reference} from './mirror.ts';
import {reelGameByText} from './reel-kind.ts';
import {clampSwim, crossed, laneBuddyBonus, routeFor} from './swim.ts';

const fold: AngleFrame = [175, 175, 60, 60, 80, 80, 175, 175];
const tree: AngleFrame = [60, 60, 170, 170, 175, 120, 175, 60];
const swapLR = (f: AngleFrame): AngleFrame => [f[1], f[0], f[3], f[2], f[5], f[4], f[7], f[6]];
const pts = Array.from({length: 26}, () => 0.5);

test('poseScore: exact = 100, mirrored = 100, close passes, different fails', () => {
  assert.equal(poseScore(fold, fold), 100);
  assert.equal(poseScore(tree, swapLR(tree)), 100);
  assert.ok(poseScore(fold, fold.map(v => (v as number) - 15)) >= MATCH_AT);
  assert.ok(poseScore(fold, tree) < 40);
  assert.equal(poseScore(fold, [null, null, null, null, null, null, null, null]), 1);
});

test('targetFor picks the clearest frame in the middle of the step', () => {
  const ref: Reference = {fps: 4, frames: [tree, tree, fold, fold, fold, fold, tree, tree], points: [pts, pts, pts, pts, null, pts, pts, pts]};
  assert.deepEqual(targetFor(ref, 0.5, 1.5)?.angles, fold);
  assert.equal(targetFor(ref, 0.5, 1.5)?.at, 0.75);
  const empty: Reference = {fps: 4, frames: Array(8).fill([null, null, null, null, null, null, null, null]), points: Array(8).fill(null)};
  assert.equal(targetFor(empty, 0, 2), null);
});

test('gradeRoutine averages step scores and skips steps with no clear pose', () => {
  const t = [{angles: fold, points: pts, at: 0}, {angles: tree, points: pts, at: 1}];
  assert.deepEqual(gradeRoutine(t, [fold, tree]), {score: 100, stepScores: [100, 100]});
  const half = gradeRoutine(t, [fold, fold]);
  assert.ok(half.stepScores[0] === 100 && half.stepScores[1] < 40 && half.score < 75);
  assert.deepEqual(gradeRoutine([t[0], null], [fold, tree]), {score: 100, stepScores: [100, 0]});
  assert.equal(gradeRoutine([null], [fold]).score, 1);
});

test('angleFrame and pointFrame read a pose and hide what the camera cannot see', () => {
  const lm = Array.from({length: 33}, () => ({x: 0.5, y: 0.5, visibility: 1}));
  lm[11] = {x: 0.4, y: 0.4, visibility: 1};
  lm[13] = {x: 0.4, y: 0.6, visibility: 1};
  lm[15] = {x: 0.6, y: 0.6, visibility: 1};
  lm[16] = {x: 0.6, y: 0.6, visibility: 0.1};
  const f = angleFrame(lm);
  assert.equal(f[0], 90);
  assert.equal(f[1], null);
  assert.equal(pointFrame(lm)?.length, 26);
  // side-on: the far hip hidden still counts (the near shoulder and hip are seen)
  lm[23] = {x: 0.5, y: 0.8, visibility: 0.1};
  assert.equal(pointFrame(lm)?.length, 26);
  // no shoulder+hip pair on either side: nobody we can place
  lm[24] = {x: 0.5, y: 0.8, visibility: 0.1};
  assert.equal(pointFrame(lm), null);
  assert.equal(pointFrame(null), null);
});

test('playable judges each step, so an intro with nobody in it does not sink the Reel', () => {
  const none: AngleFrame = [null, null, null, null, null, null, null, null];
  // 4 fps, 8 s: first 4 s are a title card, then a clear pose
  const ref: Reference = {fps: 4, frames: [...Array(16).fill(none), ...Array(16).fill(fold)], points: [...Array(16).fill(null), ...Array(16).fill(pts)]};
  assert.equal(ref.points.filter(Boolean).length / ref.frames.length, 0.5);
  assert.equal(playable(ref, [{start: 4, end: 6}, {start: 6, end: 8}]), true);
  assert.equal(playable(ref, [{start: 0, end: 2}, {start: 2, end: 3.5}]), false);
  // a clear frame only near the edge of a step still gives that step a target
  const edge: Reference = {fps: 4, frames: [fold, ...Array(7).fill(none)], points: [pts, ...Array(7).fill(null)]};
  assert.equal(targetFor(edge, 0, 2)?.at, 0);
});

test('validReference and validPoses reject bad shapes from the phone', () => {
  const ok: Reference = {fps: 8, frames: [fold, fold, fold, fold], points: [pts, pts, null, pts]};
  assert.ok(validReference(ok));
  assert.equal(validReference({...ok, points: [pts]}), false);
  assert.equal(validReference({...ok, frames: ok.frames.map(() => [500, 0, 0, 0, 0, 0, 0, 0])}), false);
  assert.equal(validReference(null), false);
  assert.ok(validPoses([fold, tree], 2));
  assert.equal(validPoses([fold], 2), false);
  assert.equal(validPoses([[1, 2, 3]], 1), false);
});

test('reel keyword backup picks the right game', () => {
  assert.equal(reelGameByText('Easy hip hop dance tutorial #choreo'), 'dance');
  assert.equal(reelGameByText('Morning vinyasa flow, warrior II and tree pose'), 'yoga');
  assert.equal(reelGameByText('Freestyle pool laps for beginners'), 'swim');
  assert.equal(reelGameByText('20 push-ups and a plank'), 'workout');
});

test('swim journeys: route by group size, clamps, lane buddy bonus, checkpoints', () => {
  assert.equal(routeFor(2).id, 'gibraltar');
  assert.equal(routeFor(5).id, 'english-channel');
  assert.equal(clampSwim(10), null);
  assert.equal(clampSwim(50_000), 10_000);
  assert.equal(laneBuddyBonus(1000, true), 200);
  assert.equal(laneBuddyBonus(1000, false), 0);
  assert.deepEqual(crossed(routeFor(5), 500, 9_500).map(c => c.name), ['Shakespeare Beach', 'Southwest shipping lane']);
});

test('jointHits marks the joints that are already right, mirrored too', () => {
  assert.deepEqual(jointHits(fold, fold), Array(8).fill(true));
  // right knee bent: only that joint is off
  const bent = [...fold];
  bent[7] = 90;
  assert.deepEqual(jointHits(fold, bent), [true, true, true, true, true, true, true, false]);
  // a mirrored copy of tree counts joint by joint, the same way poseScore does
  assert.deepEqual(jointHits(tree, swapLR(tree)), Array(8).fill(true));
  assert.deepEqual(jointHits(fold, [null, ...fold.slice(1)]), [null, true, true, true, true, true, true, true]);
});

test('angleFrame uses 3D world landmarks when present, so side-on and facing poses compare', () => {
  const lm: PoseLandmark[] = Array.from({length: 33}, () => ({x: 0.5, y: 0.5, visibility: 1, wx: 0, wy: 0, wz: 0}));
  // on screen the left arm looks straight (shoulder, elbow, wrist in a line)...
  lm[11] = {x: 0.4, y: 0.3, visibility: 1, wx: 0, wy: 0, wz: 0};
  lm[13] = {x: 0.4, y: 0.5, visibility: 1, wx: 0, wy: 0.3, wz: 0};
  // ...but the forearm points at the camera: a 90 degree elbow in 3D
  lm[15] = {x: 0.4, y: 0.6, visibility: 1, wx: 0, wy: 0.3, wz: -0.3};
  assert.equal(angleFrame(lm)[0], 90);
  // without world coordinates it falls back to the screen angle
  const flat = lm.map(({x, y, visibility}) => ({x, y, visibility}));
  assert.equal(angleFrame(flat)[0], 180);
});
