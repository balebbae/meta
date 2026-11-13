'use client';

import {IconFlag} from '@tabler/icons-react';
import {Card} from '@astryxdesign/core/Card';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {Goal, GoalMatches} from '@/lib/activities/goals';
import {GoalComposer} from '../goals/GoalComposer';
import {GoalRoadmap} from '../goals/GoalRoadmap';
import {useJson, usePanelNav} from './nav';

/** Goals panel: new goal + your goals, or one goal's roadmap. Replaces /activities/goals and /activities/goals/[id]. */
export function GoalsPanel({goalId}: {goalId: string | null}) {
  return goalId ? <GoalDetail id={goalId} /> : <GoalList />;
}

function GoalList() {
  const {open} = usePanelNav();
  const {data, error} = useJson<{goals: Goal[]}>('/api/goals');
  return (
    <VStack gap={4}>
      <Text color="secondary">Pick something to train for. Your Muse plans the weeks, checks in, and turns each week into a game.</Text>
      <GoalComposer />
      {!data ? (
        <Text color="secondary">{error ?? 'Loading your goals…'}</Text>
      ) : (
        data.goals.length > 0 && (
          <Card>
            <List hasDividers>
              {data.goals.map(goal => {
                const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0];
                return (
                  <ListItem
                    key={goal.id}
                    onClick={() => open({panel: 'goals', goal: goal.id})}
                    align="start"
                    startContent={<IconFlag size={24} color="var(--color-icon-accent)" aria-hidden />}
                    label={<Text weight="bold">{goal.title}</Text>}
                    description={
                      <VStack gap={1.5}>
                        <ProgressBar label={`${goal.title} milestones done`} isLabelHidden value={goal.progress.pct} max={100} variant={goal.status === 'done' ? 'success' : 'accent'} />
                        <Text type="supporting" color="secondary">
                          {goal.progress.done} of {goal.progress.total} milestones
                        </Text>
                      </VStack>
                    }
                    endContent={goal.status === 'done' ? <Token label="Reached" size="sm" color="green" /> : <Text type="supporting" color="secondary">Week {goal.week} of {goal.plan.weeks}{phase ? ` · ${phase.name}` : ''}</Text>}
                  />
                );
              })}
            </List>
          </Card>
        )
      )}
    </VStack>
  );
}

function GoalDetail({id}: {id: string}) {
  const {data, error} = useJson<{goal: Goal; matches: GoalMatches}>(`/api/goals/${encodeURIComponent(id)}`);
  return data ? <GoalRoadmap key={id} goal={data.goal} matches={data.matches} /> : <Text color="secondary">{error ?? 'Loading roadmap…'}</Text>;
}
