'use client';

import {useState} from 'react';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {IconCalendarCheck, IconFlag, IconFlame, IconHeartbeat, IconMoon, IconPlus, IconRoute, IconRoute2, IconSparkles, IconWalk, IconX} from '@tabler/icons-react';
import {useReducedMotion} from 'framer-motion';
import {DonutChart} from '@/components/ui/donut-chart';
import type {Goal} from '@/lib/activities/goals';
import type {HomeProgress} from '@/lib/activities/home';
import type {FitnessLevel} from '@/lib/activities/level';
import h from './home.module.css';
import {LogCard} from './LogCard';
import {useCountUp} from './useActTheme';
import {CoachButton} from '../CoachMode';
import {usePanelNav} from '../panels/nav';

// Fitness level from the last 4 weeks (lib/activities/level.ts), named on a plain difficulty scale
const TIER = {new: {name: 'Beginner', n: 1}, building: {name: 'Intermediate', n: 2}, regular: {name: 'Advanced', n: 3}, strong: {name: 'Expert', n: 4}} as const;

/** Top of Activities: the goal ring, next milestone, the stat tiles and icon actions. Owner-only data. */
export function ProgressHero({progress, goal, level}: {progress: HomeProgress; goal: Goal | null; level: FitnessLevel | null}) {
  const steps = useCountUp(progress.stepsToday);
  const active = useCountUp(progress.activeDays);
  const sleep10 = useCountUp(progress.sleepHours == null ? null : Math.round(progress.sleepHours * 10));
  const km10 = useCountUp(progress.distanceKm == null ? null : Math.round(progress.distanceKm * 10));
  const workouts = useCountUp(progress.workouts);
  const hr = useCountUp(progress.avgHr);
  const [logOpen, setLogOpen] = useState(false);
  const {open} = usePanelNav();
  // the stat tiles: add or remove one here (and its number in homeProgress)
  const stats = [
    {Icon: IconWalk, label: 'Steps today', value: steps?.toLocaleString(), unit: `/ ${(progress.stepGoal / 1000).toFixed(0)}k`, hot: progress.movedToday},
    {Icon: IconCalendarCheck, label: 'Active days this week', value: active, unit: `/ ${progress.activeTarget}`},
    {Icon: IconMoon, label: 'Sleep last night', value: sleep10 == null ? null : (sleep10 / 10).toFixed(1), unit: 'h'},
    {Icon: IconRoute2, label: 'Distance this week', value: km10 == null ? null : (km10 / 10).toFixed(1), unit: 'km'},
    {Icon: IconFlame, label: 'Workouts this week', value: workouts, unit: ''},
    {Icon: IconHeartbeat, label: 'Average heart rate this week', value: hr, unit: 'bpm'},
  ];
  // ring: goal roadmap when there is one, otherwise this week's active days against the band they picked
  const pct = goal ? goal.progress.pct : progress.activeDays != null ? Math.min(100, Math.round((progress.activeDays / progress.activeTarget) * 100)) : progress.stepsToday != null ? Math.min(100, Math.round((progress.stepsToday / progress.stepGoal) * 100)) : 0;
  const shown = useCountUp(pct, 1100) ?? 0;
  const reduceMotion = useReducedMotion();
  const next = goal?.plan.milestones.find(m => !m.done);
  const ring = (
    <DonutChart
      className={h.ring}
      role="img"
      aria-label={`${pct}% ${goal ? 'of your goal' : 'of this week'}`}
      data={[{value: pct, color: 'var(--fb-act-ember)', label: 'progress'}]}
      totalValue={100}
      size={152}
      strokeWidth={10}
      animationDuration={reduceMotion ? 0 : 1.1}
      highlightOnHover={false}
      centerContent={
        <>
          <span className={h.ringPct}>{shown}%</span>
          <span className={h.ringCap}>{goal ? 'to goal' : 'this week'}</span>
        </>
      }
    />
  );
  return (
    <section className={h.hero} aria-label="Your progress">
      <div className={h.heroTools}>
        <CoachButton className={`${h.pill} ${h.pillBlue}`}>
          <IconSparkles size={18} aria-hidden />
          Coach
        </CoachButton>
        {goal ? (
          <button type="button" className={`${h.pill} ${h.pillIcon} ${h.pillBlue}`} onClick={() => open({panel: 'goals', goal: goal.id})} aria-label="Open roadmap" title="Open roadmap">
            <IconRoute size={20} aria-hidden />
          </button>
        ) : (
          <button type="button" className={`${h.pill} ${h.pillIcon} ${h.pillBlue}`} onClick={() => open({panel: 'goals'})} aria-label="Set a goal" title="Set a goal">
            <IconFlag size={20} aria-hidden />
          </button>
        )}
        <button type="button" className={`${h.pill} ${h.pillIcon} ${h.pillBlue}`} onClick={() => setLogOpen(o => !o)} aria-expanded={logOpen} aria-label="Log a workout" title="Log a workout">
          {logOpen ? <IconX size={20} aria-hidden /> : <IconPlus size={20} aria-hidden />}
        </button>
      </div>
      <div className={h.heroGrid}>
        <div>
          <div className={h.chips}>
            {level && (
              <Tooltip content={`Level ${TIER[level.tier].n} of 4, from your last 4 weeks of workouts. Only you see this.`}>
                <span className={`${h.chip} ${h.chipLevel}`} tabIndex={0}>
                  {TIER[level.tier].name}
                </span>
              </Tooltip>
            )}
            {!goal && level?.easyWeek && <span className={h.chip}>Easy week</span>}
          </div>
          <div className={h.headRow}>
            <h2 className={h.headline}>{goal ? goal.title : progress.movedToday ? 'You already moved today.' : 'Make today count.'}</h2>
            {goal && (
              <span className={h.weekText}>
                Week {goal.week}/{goal.plan.weeks}
              </span>
            )}
          </div>
          {next && (
            <p className={h.lede}>
              <IconFlag size={15} aria-hidden />
              <span className={h.srOnly}>Next milestone:</span> {next.title}
            </p>
          )}
        </div>
        {ring}
      </div>
      {logOpen && <LogCard onClose={() => setLogOpen(false)} />}
      <div className={h.stats}>
        {stats.map(({Icon, label, value, unit, hot}) => (
          <div key={label} className={`${h.stat} ${hot ? h.statHot : ''}`} title={label}>
            <span className={h.statLabel}>
              <Icon size={18} aria-hidden />
              <span className={h.srOnly}>{label}</span>
            </span>
            <span className={h.statValue}>
              {value ?? '—'} {unit && <em>{unit}</em>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
