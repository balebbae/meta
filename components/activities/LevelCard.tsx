import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {FitnessLevel, Tier} from '@/lib/activities/level';

const TIER_LABEL: Record<Tier, string> = {new: 'Just starting', building: 'Building', regular: 'Regular', strong: 'Strong'};
const TIER_COLOR = {new: 'gray', building: 'blue', regular: 'green', strong: 'purple'} as const;
const EASY_WHY = {recovery: 'your Whoop recovery is low', spike: 'you did a lot more than usual this week', sleep: 'you have slept under 6 hours lately'};
const per = (n: number) => (n < 1 ? 'under 1' : `${Math.round(n)}`);

/** What the owner's Muse plans from: decided by code over 4 weeks of synced + logged workouts. Owner-only. */
export function LevelCard({level}: {level: FitnessLevel}) {
  const weeks = level.weeks === 1 ? 'week' : `${level.weeks} weeks`;
  return (
    <VStack gap={3} as="section" aria-label="Your level">
      <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
        <Heading level={2}>Your level</Heading>
        <Button label="Devices" variant="ghost" size="sm" href="/activities/muse#devices" />
      </HStack>
      <Card>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Token label={TIER_LABEL[level.tier]} color={TIER_COLOR[level.tier]} />
            <Text color="secondary">
              {per(level.activeDaysPerWeek)} active days a week
              {level.stepsPerDay != null ? ` · ${Math.round(level.stepsPerDay / 100) / 10}k steps a day` : ''}
              {level.sleepHours != null ? ` · ${level.sleepHours} h sleep` : ''}
            </Text>
          </HStack>
          {level.easyWeek && <Banner status="info" title={`Your Muse is keeping this week easy because ${EASY_WHY[level.easyWeek]}.`} />}
          {level.activities.length > 0 && (
            <List hasDividers density="compact">
              {level.activities.map(a => (
                <ListItem
                  key={a.kind}
                  label={a.kind[0].toUpperCase() + a.kind.slice(1)}
                  description={`${per(a.perWeek)} a week${a.kmPerWeek ? ` · ${a.kmPerWeek} km a week` : ''}${a.trend !== 'steady' ? ` · trending ${a.trend}` : ''}`}
                  endContent={<Token label={TIER_LABEL[a.tier]} size="sm" color={TIER_COLOR[a.tier]} />}
                />
              ))}
            </List>
          )}
          <Text type="supporting" color="secondary">
            From your last {weeks} of synced and logged workouts. Your Muse uses it for goal plans, suggestions, Coach mode and fair Rally games, rounded, never your Whoop numbers.
          </Text>
        </VStack>
      </Card>
    </VStack>
  );
}
