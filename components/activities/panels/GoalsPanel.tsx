'use client';

import type {Goal, GoalMatches} from '@/lib/activities/goals';
import {GoalComposer} from '../goals/GoalComposer';
import {GoalRoadmap} from '../goals/GoalRoadmap';
import {useJson, usePanelNav} from './nav';
import p from './panels.module.css';

/** Goals panel: new goal + your goals, or one goal's roadmap. Replaces /activities/goals and /activities/goals/[id]. */
export function GoalsPanel({goalId}: {goalId: string | null}) {
  return goalId ? <GoalDetail id={goalId} /> : <GoalList />;
}

function Loading({error}: {error: string | null}) {
  return error ? <p className={p.error}>{error}</p> : <p className={p.note}>Loading…</p>;
}

function GoalList() {
  const {open} = usePanelNav();
  const {data, error} = useJson<{goals: Goal[]}>('/api/goals');
  return (
    <div className={p.stack}>
      <GoalComposer />
      {!data ? (
        <Loading error={error} />
      ) : (
        data.goals.length > 0 && (
          <ul className={p.list}>
            {data.goals.map(goal => (
              <li key={goal.id} className={p.row}>
                <button type="button" className={p.rowMain} onClick={() => open({panel: 'goals', goal: goal.id})}>
                  <span className={p.rowText}>
                    <strong>
                      {goal.title}
                      {goal.status === 'done' ? <span className={`${p.badge} ${p.green}`}>Reached</span> : <span className={p.metric}>Week {goal.week}/{goal.plan.weeks}</span>}
                    </strong>
                    <span className={`${p.bar} ${goal.status === 'done' ? p.done : ''}`} role="progressbar" aria-label={`${goal.title} milestones done`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progress.pct}>
                      <span style={{width: `${goal.progress.pct}%`}} />
                    </span>
                    <small>
                      {goal.progress.done} of {goal.progress.total} milestones
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function GoalDetail({id}: {id: string}) {
  const {data, error} = useJson<{goal: Goal; matches: GoalMatches}>(`/api/goals/${encodeURIComponent(id)}`);
  return data ? <GoalRoadmap key={id} goal={data.goal} matches={data.matches} /> : <Loading error={error} />;
}
