'use client';
import {StepShell} from './StepShell';
import {PrivacyMatrix} from '../PrivacyMatrix';
import type {PolicyMatrix} from '@/lib/activities/policies';
import styles from '../activities.module.css';

export function PrivacyStep({policies, invite}: {policies: PolicyMatrix; invite: number | null}) {
  return (
    <StepShell step="privacy" invite={invite} skippable={false} continueLabel={invite ? 'Looks good, join the game' : 'Looks good'}>
      <p className={styles.sub}>Sensible defaults are already on: friends see whether you moved, game-mates see rounded numbers, heart rate and sleep stay Muse-only. Tap a row to change it.</p>
      <div className={styles.card}>
        <PrivacyMatrix initial={policies} compact />
      </div>
    </StepShell>
  );
}
