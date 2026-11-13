import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NO_INPUT, edges, type Input} from './common.ts';
import {JOUST, createJoust, startJoust, stepJoust} from './joust.ts';
import {DASH, createDash, startDash, stepDash} from './dash.ts';
import {DEFENSE, WAVES, createDefense, startDefense, stepDefense} from './defense.ts';
import {MAP, QUEST, createQuest, startQuest, stepQuest, walkable} from './quest.ts';
import {DIFFICULTY} from '../difficulty.ts';

const press = (over: Partial<Input>): Input => ({...NO_INPUT, ...over});
const run = <S>(s: S, step: (s: S, i: Input, dt: number) => S, seconds: number, input: Input = {...NO_INPUT}, dt = 1 / 60): S => { for (let t = 0; t < seconds; t += dt) step(s, input, dt); return s; };

test('edges only fire on the rising frame', () => {
  const a = press({action: true});
  assert.equal(edges(NO_INPUT, a).action, true);
  assert.equal(edges(a, a).action, false);
});

test('joust: matching the opening and bracing on time is a perfect strike', () => {
  const s = startJoust(createJoust(7));
  assert.equal(s.phase, 'playing'); assert.equal(s.pass, 1);
  // Wait for the reveal, aim at the opening, brace exactly at impact.
  run(s, stepJoust, JOUST.impactT - JOUST.revealT + 0.05);
  assert.equal(s.openingShown, true);
  while (s.playerLane !== s.foeOpening) stepJoust(s, press(s.playerLane < s.foeOpening ? {up: true} : {down: true}), 0.001), stepJoust(s, {...NO_INPUT}, 0.001);
  while (s.passT < JOUST.impactT - 0.02) stepJoust(s, {...NO_INPUT}, 1 / 120);
  stepJoust(s, press({action: true}), 1 / 120);
  while (!s.resolved) stepJoust(s, {...NO_INPUT}, 1 / 120);
  assert.deepEqual(s.results, ['perfect']); assert.equal(s.playerScore, 3);
});

test('joust: five idle passes end the match and the foe can win it', () => {
  const s = startJoust(createJoust(3));
  run(s, stepJoust, JOUST.passLen * JOUST.passes + 0.5);
  assert.ok(s.phase === 'won' || s.phase === 'lost'); assert.equal(s.results.length, JOUST.passes);
  assert.equal(s.playerScore + s.foeScore >= s.results.filter((r) => r === 'miss').length, true);
});

test('dash: flapping raises the dragon, gravity lowers it, pillars spawn ahead', () => {
  const s = startDash(createDash(2));
  const y0 = s.y; stepDash(s, press({jump: true}), 1 / 60); assert.ok(s.vy > 0);
  run(s, stepDash, 0.5); assert.notEqual(s.y, y0); assert.ok(s.pillars.length > 0); assert.ok(s.pillars[0].x > s.dist);
});

test('dash: the run ends lost after three collisions or won at the goal', () => {
  const s = startDash(createDash(2));
  run(s, stepDash, 40); // never flapping: the dragon sits on the floor and hits every pillar bottom
  assert.equal(s.phase, 'lost'); assert.equal(s.lives, 0);
  const w = startDash(createDash(2)); w.lives = 999;
  run(w, stepDash, DASH.goal / DASH.speed + 1);
  assert.equal(w.phase, 'won');
});

test('defense: swinging in the enemy lane deals shared-table damage; the gate falls when ignored', () => {
  const s = startDefense(createDefense(5));
  assert.equal(s.wave, 1);
  run(s, stepDefense, 0.7); assert.equal(s.enemies.length, 1);
  const en = s.enemies[0]; assert.equal(en.maxHp, DIFFICULTY[en.kind][en.variant].hp);
  while (en.z > DEFENSE.playerZ + DEFENSE.reach) stepDefense(s, {...NO_INPUT}, 1 / 60);
  while (s.lane !== en.lane) stepDefense(s, press(s.lane < en.lane ? {right: true} : {left: true}), 1 / 60), stepDefense(s, {...NO_INPUT}, 1 / 60);
  stepDefense(s, press({action: true}), 1 / 60);
  assert.equal(en.hp, en.maxHp - DEFENSE.playerDamage);
  const idle = startDefense(createDefense(5)); run(idle, stepDefense, 90);
  assert.equal(idle.phase, 'lost'); assert.equal(idle.gateHp, 0);
});

test('defense: killing every wave wins and the last wave holds the boss', () => {
  const s = startDefense(createDefense(9)); s.attackCd = 0;
  const total = WAVES.reduce((n, w) => n + w.length, 0);
  for (let i = 0; i < 60 * 240 && s.phase === 'playing'; i++) {
    const target = s.enemies.filter((e) => e.state !== 'dead').sort((a, b) => a.z - b.z)[0];
    const inp = target && i % 2 === 0 ? press({left: s.lane > target.lane, right: s.lane < target.lane, action: true}) : {...NO_INPUT}; // release every other frame so edges re-fire
    stepDefense(s, inp, 1 / 60);
    for (const en of s.enemies) if (en.state !== 'dead') en.z = DEFENSE.playerZ + 1; // hold them in reach: this test is about the wave loop, not the walk
  }
  assert.equal(s.phase, 'won'); assert.equal(s.kills, total);
  assert.equal(WAVES[WAVES.length - 1].some((w) => w.variant === 'boss'), true);
});

test('quest: the map is bordered, every patrol route is walkable and chests are reachable', () => {
  for (const row of MAP) { assert.equal(row.length, MAP[0].length); assert.equal(row[0], '#'); assert.equal(row[row.length - 1], '#'); }
  const s = createQuest(); assert.equal(s.chests.length, 3); assert.deepEqual(s.chests.map((c) => c.item).sort(), [...QUEST.items].sort());
  for (const p of s.patrols) for (const [x, y] of p.route) assert.equal(walkable(x, y), true, `patrol tile ${x},${y}`);
  const seen = new Set<string>(), stack = [[s.hero.x, s.hero.y]];
  while (stack.length) { const [x, y] = stack.pop()!; const k = `${x},${y}`; if (seen.has(k) || !walkable(x, y)) continue; seen.add(k); stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  for (const c of s.chests) assert.equal(seen.has(`${c.x},${c.y}`), true, `chest ${c.x},${c.y} reachable`);
  assert.equal([...seen].some((k) => { const [x, y] = k.split(',').map(Number); return MAP[y][x] === 'G'; }), true);
});

test('quest: walking onto a chest collects its item; the gate only opens with all three', () => {
  const s = startQuest(createQuest());
  // Start is (1,1); the first chest is at (1,4): walk down three tiles.
  run(s, stepQuest, QUEST.stepEvery * 3 + 0.05, press({down: true}));
  assert.equal(s.hero.y, 4); assert.equal(s.items.length, 1); assert.equal(s.score, 100);
  s.hero.x = 5; s.hero.y = 8; s.hero.moveT = 0; // teleport next to the gate for the gate rule
  run(s, stepQuest, QUEST.stepEvery + 0.05, press({down: true}));
  assert.equal(s.phase, 'playing');
  s.items = ['crown', 'scepter', 'orb']; stepQuest(s, {...NO_INPUT}, 1 / 60);
  assert.equal(s.phase, 'won'); assert.ok(s.score > 100);
});

test('quest: the clock runs out', () => {
  const s = startQuest(createQuest()); s.patrols = [];
  run(s, stepQuest, QUEST.timeLimit + 1);
  assert.equal(s.phase, 'lost');
});
