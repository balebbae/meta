import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {GoalComposer} from '@/components/activities/goals/GoalComposer';
import {listGoals} from '@/lib/activities/goals';
import {getSessionUser} from '@/lib/auth';
import g from '@/components/activities/goals/goals.module.css';

export const metadata: Metadata = {title: 'Goals | Facebook'};
export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const goals = await listGoals(user.id);
  return (
    <main className={`${g.page} ${g.narrow}`}>
      <div>
        <h1 className={g.h1}>Goals</h1>
        <p className={g.muted} style={{marginTop: 4}}>
          Pick something to train for. Your Muse plans the weeks, checks in, and turns each week into a game.
        </p>
      </div>
      <GoalComposer />
      {goals.map(goal => {
        const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0];
        return (
          <Link key={goal.id} href={`/activities/goals/${goal.id}`} className={`${g.card} ${g.goalRow}`}>
            <span className={g.goalIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
              </svg>
            </span>
            <span className={g.grow} style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <span className={g.row} style={{justifyContent: 'space-between'}}>
                <span className={g.h2}>{goal.title}</span>
                {goal.status === 'done' ? (
                  <span className={g.pillGreen}>Reached</span>
                ) : (
                  <span className={g.muted}>
                    Week {goal.week} of {goal.plan.weeks} · {phase.name}
                  </span>
                )}
              </span>
              <span className={g.bar}>
                <span className={g.barFill} style={{width: `${goal.progress.pct}%`, display: 'block'}} />
              </span>
              <span className={g.muted}>
                {goal.progress.done} of {goal.progress.total} milestones
              </span>
            </span>
          </Link>
        );
      })}
    </main>
  );
}
