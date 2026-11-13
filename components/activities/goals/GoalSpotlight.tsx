import {Flag} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import type {Goal} from '@/lib/activities/goals';

/** Top of Discover: your active goal's roadmap at a glance, or one line inviting you to set one. */
export function GoalSpotlight({goal}: {goal: Goal | null}) {
  if (!goal) {
    return (
      <Card variant="blue" aria-label="Set a goal">
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Icon icon={Flag} size="lg" color="accent" />
          <VStack gap={1} width="min(100%, 520px)">
            <Heading level={3}>Training for something?</Heading>
            <Text type="supporting" color="secondary">
              Tell your Muse a goal, like a HYROX or your first 5K. You get a week-by-week roadmap, a solo game and people on the same path.
            </Text>
          </VStack>
          <Button label="Set a goal" variant="primary" href="/activities/goals" />
        </HStack>
      </Card>
    );
  }
  const phase = goal.plan.phases.find(p => goal.week >= p.startWeek && goal.week <= p.endWeek) ?? goal.plan.phases[0];
  const next = goal.plan.milestones.find(m => !m.done);
  return (
    <Card aria-label="Your goal">
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Icon icon={Flag} size="lg" color="accent" />
        <VStack gap={2} width="min(100%, 520px)">
          <HStack gap={2} justify="between" vAlign="center" wrap="wrap">
            <Heading level={3}>{goal.title}</Heading>
            <Text type="supporting" color="secondary">
              Week {goal.week} of {goal.plan.weeks} · {phase.name}
            </Text>
          </HStack>
          <ProgressBar label={`${goal.title} milestones done`} isLabelHidden value={goal.progress.pct} max={100} />
          <Text type="supporting" color="secondary">
            {next ? `Next: ${next.title} (week ${next.week})` : 'Every milestone is done.'}
          </Text>
        </VStack>
        <Button label="Open roadmap" href={`/activities/goals/${goal.id}`} />
      </HStack>
    </Card>
  );
}
