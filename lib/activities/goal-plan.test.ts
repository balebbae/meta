import {test} from 'node:test';
import assert from 'node:assert/strict';
import {componentStatus, currentWeek, fallbackCheckin, fallbackPlan, matchEvent, normalizePlan, progressOf, weeksUntil} from './goal-plan.ts';

const contiguous = (phases: {startWeek: number; endWeek: number}[], weeks: number) => {
  assert.equal(phases[0].startWeek, 1);
  assert.equal(phases[phases.length - 1].endWeek, weeks);
  for (let i = 1; i < phases.length; i++) assert.equal(phases[i].startWeek, phases[i - 1].endWeek + 1);
  for (const p of phases) assert.ok(p.endWeek >= p.startWeek);
};

test('matchEvent: half marathon wins over marathon, HYROX has its 8 stations + running', () => {
  assert.equal(matchEvent('I want to compete in a Hyrox in March')?.kind, 'hyrox');
  assert.equal(matchEvent('first half marathon')?.kind, 'half_marathon');
  assert.equal(matchEvent('run a marathon')?.kind, 'marathon');
  assert.equal(matchEvent('couch to 5k')?.kind, '5k');
  assert.equal(matchEvent('do 20 pull-ups'), null);
  assert.equal(matchEvent('hyrox')?.components.length, 9);
});

test('fallbackPlan phases are contiguous for short and long plans', () => {
  for (const weeks of [4, 5, 6, 12, 18, 30]) {
    contiguous(fallbackPlan(matchEvent('hyrox'), 'HYROX', weeks).phases, weeks);
    contiguous(fallbackPlan(null, 'Do 20 pull-ups', weeks).phases, weeks);
  }
  const p = fallbackPlan(matchEvent('hyrox'), 'HYROX', 12);
  assert.equal(p.milestones.at(-1)?.title, 'Race day');
  assert.ok(p.milestones.every(m => p.phases.some(ph => ph.id === m.phaseId && m.week >= ph.startWeek && m.week <= ph.endWeek)));
});

test('normalizePlan repairs gaps, clamps weeks and drops unknown components', () => {
  const ev = matchEvent('hyrox')!;
  const fb = fallbackPlan(ev, 'HYROX', 10);
  const out = normalizePlan(
    {
      summary: 'Ten weeks to HYROX.',
      phases: [
        {name: 'Build', startWeek: 5, endWeek: 8, focus: 'more'},
        {name: 'Base', startWeek: 1, endWeek: 2, focus: 'easy'},
        {name: 'Taper', startWeek: 9, endWeek: 40, focus: 'rest'},
      ],
      milestones: [
        {title: 'Wall balls 100', week: 6, componentId: 'wall-balls'},
        {title: 'Made up station', week: 3, componentId: 'tyre-flip'},
        {title: 'Race day', week: 99, componentId: null},
        {title: 'race day', week: 10, componentId: null},
      ],
    },
    10,
    ev.components,
    fb,
  );
  contiguous(out.phases, 10);
  assert.deepEqual(out.phases.map(p => p.name), ['Base', 'Build', 'Taper']);
  assert.deepEqual(out.milestones.map(m => m.week), [3, 6, 10]);
  assert.equal(out.milestones[0].componentId, null);
  assert.equal(out.milestones[1].componentId, 'wall-balls');
  assert.equal(normalizePlan({phases: [], milestones: []}, 10, ev.components, fb).milestones.length, fb.milestones.length);
});

test('weeksUntil and currentWeek', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  assert.equal(weeksUntil('2027-02-04', now), 12);
  assert.equal(weeksUntil('2020-01-01', now), null);
  assert.equal(weeksUntil('March', now), null);
  assert.equal(currentWeek('2026-11-01T12:00:00Z', 12, now), 2);
  assert.equal(currentWeek('2025-01-01T00:00:00Z', 12, now), 12);
});

test('progress, component status and offline check-in', () => {
  const plan = fallbackPlan(matchEvent('hyrox'), 'HYROX', 12);
  assert.deepEqual(progressOf(plan), {done: 0, total: 8, pct: 0});
  assert.equal(componentStatus(plan, 'wall-balls', 1), 'later');
  const wb = plan.milestones.find(m => m.componentId === 'wall-balls')!;
  assert.equal(componentStatus(plan, 'wall-balls', wb.week), 'training');
  wb.done = true;
  assert.equal(componentStatus(plan, 'wall-balls', 1), 'ready');
  assert.equal(fallbackCheckin(plan, 1).status, 'ahead');
  wb.done = false;
  assert.equal(fallbackCheckin(plan, 5).status, 'behind');
  assert.equal(fallbackCheckin(plan, 1).status, 'on_track');
});
