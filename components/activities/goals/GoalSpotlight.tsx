import Link from 'next/link';
import type {Goal} from '@/lib/activities/goals';
import g from './goals.module.css';

function FlagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

/** Top of Discover: your active goal's roadmap at a glance, or one line inviting you to set one. */
export function GoalSpotlight({goal}: {goal: Goal | null}) {
  if (!goal) {
    return (
      <section className={`${g.card} ${g.spot}`} aria-label="Set a goal" style={{marginBottom: 16}}>
        <span className={g.goalIcon}>
          <FlagIcon />
        </span>
        <div className={g.spotBody}>
          <span className={g.h2}>Training for something?</span>
          <span className={g.muted}>Tell your Muse a goal, like a HYROX or your first 5K. You get a week-by-week roadmap, a solo game and people on the same path.</span>
        </div>
        <Link href="/activities/goals" className={g.btnPrimary}>
          Set a goal
        </Link>
      </section>
    );
  }
  const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0];
  const next = goal.plan.milestones.find(m => !m.done);
  return (
    <section className={`${g.card} ${g.spot}`} aria-label="Your goal" style={{marginBottom: 16}}>
      <span className={g.goalIcon}>
        <FlagIcon />
      </span>
      <div className={g.spotBody}>
        <div className={g.row} style={{justifyContent: 'space-between'}}>
          <span className={g.h2}>{goal.title}</span>
          <span className={g.muted}>
            Week {goal.week} of {goal.plan.weeks} · {phase.name}
          </span>
        </div>
        <div className={g.bar} role="progressbar" aria-label={`${goal.title} milestones done`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progress.pct}>
          <div className={g.barFill} style={{width: `${goal.progress.pct}%`}} />
        </div>
        <span className={g.muted}>{next ? `Next: ${next.title} (week ${next.week})` : 'Every milestone is done.'}</span>
      </div>
      <Link href={`/activities/goals/${goal.id}`} className={g.btnSoft}>
        Open roadmap
      </Link>
    </section>
  );
}
