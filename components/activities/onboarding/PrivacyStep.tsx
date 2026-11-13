'use client';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {StepShell} from './StepShell';
import {PrivacyMatrix} from '../PrivacyMatrix';
import type {PolicyMatrix} from '@/lib/activities/policies';

export function PrivacyStep({policies, invite}: {policies: PolicyMatrix; invite: number | null}) {
  return (
    <StepShell step="privacy" invite={invite} skippable={false} continueLabel={invite ? 'Looks good, join the game' : 'Looks good'}>
      <Text color="secondary">Sensible defaults are already on: friends see whether you moved, game-mates see rounded numbers, heart rate and sleep stay Muse-only. Open a row to change it.</Text>
      <Card>
        <PrivacyMatrix initial={policies} compact />
      </Card>
    </StepShell>
  );
}
