'use client';

import Link from 'next/link';
import {BorderBeam} from 'border-beam';
import type {Goal} from '@/lib/activities/goals';
import type {HomeProgress} from '@/lib/activities/home';
import type {FitnessLevel} from '@/lib/activities/level';
import h from './home.module.css';
import {useActTheme, useCountUp} from './useActTheme';

const TIER_LABEL = {new: 'Just starting', building: 'Building', regular: 'Regular', strong: 'Strong'} as const;
const R = 64;
const C = 2 * Math.PI * R;

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

/** Top of Activities: the goal ring, today's three numbers and one ember action. Owner-only data. */
export function ProgressHero({name, progress, goal, level}: {name: string; progress: HomeProgress; goal: Goal | null; level: FitnessLevel | null}) {
  const theme = useActTheme();
  const steps = useCountUp(progress.stepsToday);
  const active = useCountUp(progress.activeDays);
  const sleep10 = useCountUp(progress.sleepHours == null ? null : Math.round(progress.sleepHours * 10));
  // ring: goal roadmap when there is one, otherwise this week's active days against the band they picked
  const pct = goal ? goal.progress.pct : progress.activeDays != null ? Math.min(100, Math.round((progress.activeDays / progress.activeTarget) * 100)) : progress.stepsToday != null ? Math.min(100, Math.round((progress.stepsToday / progress.stepGoal) * 100)) : 0;
  const shown = useCountUp(pct, 1100) ?? 0;
  const phase = goal ? (goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0]) : null;
  const next = goal?.plan.milestones.find(m => !m.done);
  const first = name.split(' ')[0];
  const ring = (
    <div className={h.ring} role="img" aria-label={`${pct}% ${goal ? 'of your goal' : 'of this week'}`}>
      <svg viewBox="0 0 152 152">
        <defs>
          <linearGradient id="actRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--fb-act-blue)" />
            <stop offset="1" stopColor="var(--fb-act-ember)" />
          </linearGradient>
        </defs>
        <circle className={h.ringTrack} cx="76" cy="76" r={R} />
        <circle className={h.ringBar} cx="76" cy="76" r={R} stroke="url(#actRing)" strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
      </svg>
      <div className={h.ringCenter}>
        <span className={h.ringPct}>{shown}%</span>
        <span className={h.ringCap}>{goal ? 'to goal' : 'this week'}</span>
      </div>
    </div>
  );
  return (
    <section className={h.hero} aria-label="Your progress">
      <div className={h.heroGrid}>
        <div>
          <p className={h.eyebrow}>
            {greeting()}, {first}
            {level ? ` · ${TIER_LABEL[level.tier]}` : ''}
          </p>
          <h2 className={h.headline}>{goal ? goal.title : progress.movedToday ? 'You already moved today.' : 'Make today count.'}</h2>
          <p className={h.lede}>{goal ? `Week ${goal.week} of ${goal.plan.weeks}${phase ? ` · ${phase.name}` : ''}${next ? ` · next: ${next.title}` : ''}` : level?.easyWeek ? 'Your Muse is keeping this week easy.' : 'Steps, sleep and active days from your synced devices. Only you see them.'}</p>
          <div className={h.stats}>
            <div className={`${h.stat} ${progress.movedToday ? h.statHot : ''}`}>
              <span className={h.statLabel}>Steps today</span>
              <span className={h.statValue}>
                {steps == null ? '—' : steps.toLocaleString()} <em>/ {(progress.stepGoal / 1000).toFixed(0)}k</em>
              </span>
            </div>
            <div className={h.stat}>
              <span className={h.statLabel}>Active days</span>
              <span className={h.statValue}>
                {active ?? '—'} <em>of {progress.activeTarget} this week</em>
              </span>
            </div>
            <div className={h.stat}>
              <span className={h.statLabel}>Sleep</span>
              <span className={h.statValue}>
                {sleep10 == null ? '—' : (sleep10 / 10).toFixed(1)} <em>h last night</em>
              </span>
            </div>
          </div>
          <div className={h.actions}>
            <Link className={`${h.pill} ${h.pillEmber}`} href="/activities/log">
              Log a move
            </Link>
            {goal ? (
              <Link className={`${h.pill} ${h.pillQuiet}`} href={`/activities/goals/${goal.id}`}>
                Open roadmap
              </Link>
            ) : (
              <Link className={`${h.pill} ${h.pillQuiet}`} href="/activities/goals">
                Set a goal
              </Link>
            )}
          </div>
        </div>
        {progress.movedToday ? (
          <BorderBeam size="pulse-outside" colorVariant="sunset" theme={theme} strength={0.7} borderRadius={999}>
            {ring}
          </BorderBeam>
        ) : (
          ring
        )}
      </div>
    </section>
  );
}
