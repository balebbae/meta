import assert from 'node:assert/strict';
import {test} from 'node:test';
import {autoDash, autoDefense, autoJoust, autoQuest} from './autopilot.ts';
import {createDash, startDash, stepDash} from './dash.ts';
import {createDefense, startDefense, stepDefense} from './defense.ts';
import {createJoust, startJoust, stepJoust} from './joust.ts';
import {createQuest, startQuest, stepQuest} from './quest.ts';

const run = <S extends {phase: string}>(s: S, step: (s: S, dt: number) => void, seconds: number): S => { for (let i = 0; i < seconds * 60 && s.phase === 'playing'; i++) step(s, 1 / 60); return s; };

test('autopilot: the joust demo reads every opening and wins the tourney', () => {
  const s = run(startJoust(createJoust(3)), (st, dt) => stepJoust(st, autoJoust(st), dt), 30);
  assert.equal(s.phase, 'won'); assert.equal(s.results.filter((r) => r === 'perfect').length, 5);
});
test('autopilot: the defense demo holds the gate through the first waves', () => {
  const s = run(startDefense(createDefense(3)), (st, dt) => stepDefense(st, autoDefense(st), dt), 40);
  assert.ok(s.kills >= 8, `kills ${s.kills}`); assert.ok(s.gateHp > 0, `gate ${s.gateHp}`);
});
test('autopilot: the dash demo clears towers', () => {
  const s = run(startDash(createDash(3)), (st, dt) => stepDash(st, autoDash(st), dt), 12);
  assert.ok(s.score >= 60, `score ${s.score}, lives ${s.lives}, dist ${s.dist.toFixed(0)}`);
});
test('autopilot: the quest demo finds all three treasures and reaches the gate', () => {
  const s = run(startQuest(createQuest(3)), (st, dt) => stepQuest(st, autoQuest(st), dt), 90);
  assert.equal(s.items.length, 3); assert.equal(s.phase, 'won');
});
