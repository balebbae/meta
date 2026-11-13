import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {IconFlag as Flag} from '@tabler/icons-react';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {List, ListItem} from '@astryxdesign/core/List';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {GoalComposer} from '@/components/activities/goals/GoalComposer';
import {listGoals} from '@/lib/activities/goals';
import {getSessionUser} from '@/lib/auth';

export const metadata: Metadata = {title: 'Goals | Facebook'};
export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const goals = await listGoals(user.id);
  return (
    <VStack gap={4} paddingBlock={4} maxWidth={720}>
      <VStack gap={1}>
        <Heading level={1}>Goals</Heading>
        <Text color="secondary">Pick something to train for. Your Muse plans the weeks, checks in, and turns each week into a game.</Text>
      </VStack>
      <GoalComposer />
      {goals.length > 0 && (
        <Card>
          <List hasDividers>
            {goals.map(goal => {
              const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0];
              return (
                <ListItem
                  key={goal.id}
                  href={`/activities/goals/${goal.id}`}
                  align="start"
                  startContent={<Flag size={24} color="var(--color-icon-accent)" aria-hidden />}
                  label={<Text weight="bold">{goal.title}</Text>}
                  description={
                    <VStack gap={1.5}>
                      <ProgressBar label={`${goal.title} milestones done`} isLabelHidden value={goal.progress.pct} max={100} variant={goal.status === 'done' ? 'success' : 'accent'} />
                      <Text type="supporting" color="secondary">
                        {goal.progress.done} of {goal.progress.total} milestones
                      </Text>
                    </VStack>
                  }
                  endContent={goal.status === 'done' ? <Token label="Reached" size="sm" color="green" /> : <Text type="supporting" color="secondary">Week {goal.week} of {goal.plan.weeks} · {phase.name}</Text>}
                />
              );
            })}
          </List>
        </Card>
      )}
    </VStack>
  );
}
