'use client';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {StepShell} from './StepShell';
import {ConnectorHub, type PublicConnection} from '../ConnectorHub';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {Platform} from '@/lib/activities/types';

export function ConnectStep({platform, cards, connections, invite}: {platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]; invite: number | null}) {
  return (
    <StepShell step="connect" invite={invite}>
      <Text color="secondary">
        Everything lands in your private vault first. Detected: {platform === 'ios' ? 'iPhone' : platform === 'android' ? 'Android' : 'desktop browser'}. No device? Photo proof and manual logs work everywhere; the demo watch fills a week in one tap.
      </Text>
      <Card>
        <ConnectorHub platform={platform} cards={cards} connections={connections} compact />
      </Card>
    </StepShell>
  );
}
