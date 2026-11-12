'use client';
import {StepShell} from './StepShell';
import {ConnectorHub, type PublicConnection} from '../ConnectorHub';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {Platform} from '@/lib/activities/types';
import styles from '../activities.module.css';

export function ConnectStep({platform, cards, connections, invite}: {platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]; invite: number | null}) {
  return (
    <StepShell step="connect" invite={invite}>
      <p className={styles.sub}>
        Everything lands in your private vault first. Detected: {platform === 'ios' ? 'iPhone' : platform === 'android' ? 'Android' : 'desktop browser'}. No device? Photo proof and manual logs work everywhere; the demo watch fills a week in one tap.
      </p>
      <div className={styles.card}>
        <ConnectorHub platform={platform} cards={cards} connections={connections} compact />
      </div>
    </StepShell>
  );
}
