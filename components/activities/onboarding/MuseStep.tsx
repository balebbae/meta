'use client';
import {Ban, Brain, EyeOff, MessageCircle} from 'lucide-react';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {StepShell} from './StepShell';
import type {MuseSummary} from '@/lib/activities/summary';

export function MuseStep({summary, invite, name}: {summary: MuseSummary; invite: number | null; name: string}) {
  return (
    <StepShell step="muse" invite={invite} skippable={false} continueLabel="Go to Activities">
      <Card variant="blue">
        <VStack gap={4}>
          <HStack gap={3} vAlign="center">
            <Icon icon={Brain} size="lg" color="accent" />
            <VStack gap={0.5}>
              <Heading level={2}>Hi {name.split(' ')[0]}, I&apos;m your Muse.</Heading>
              <Text type="supporting" color="secondary">
                {summary.headline}
              </Text>
            </VStack>
          </HStack>
          <VStack gap={1}>
            <Heading level={3}>What I&apos;ll say about you</Heading>
            <List density="compact">
              {summary.shares.map(s => (
                <ListItem key={s} startContent={<Icon icon={MessageCircle} size="sm" color="accent" />} label={s} />
              ))}
            </List>
          </VStack>
          {summary.secrets.length > 0 && (
            <VStack gap={1}>
              <Heading level={3}>What stays between us</Heading>
              <List density="compact">
                {summary.secrets.map(s => (
                  <ListItem key={s} startContent={<Icon icon={EyeOff} size="sm" color="secondary" />} label={s} />
                ))}
              </List>
            </VStack>
          )}
          <List density="compact">
            <ListItem startContent={<Icon icon={Ban} size="sm" color="secondary" />} label={summary.nobody} />
          </List>
          <Text type="supporting" color="secondary">
            Every question anyone asks me is logged for you. Read it any time under <Link href="/activities/privacy">Activities → Privacy</Link>, or see everything I know on <Link href="/activities/muse">your Muse page</Link>.
          </Text>
        </VStack>
      </Card>
    </StepShell>
  );
}
