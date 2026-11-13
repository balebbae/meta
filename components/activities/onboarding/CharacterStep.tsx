'use client';
import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import type {HeroPick} from '@/lib/kingdom/cast';
import {HeroPicker} from '@/components/rally/HeroPicker';
import {StepShell} from './StepShell';

/** First onboarding step: pick the hero that walks with you in Turf and fights beside your squad in Rally. */
export function CharacterStep({initial, invite}: {initial: HeroPick | null; invite: number | null}) {
  const [hero, setHero] = useState<HeroPick | null>(initial);

  async function save() {
    const res = await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({hero})});
    if (!res.ok) throw new Error('Could not save your hero');
  }

  return (
    <StepShell step="character" invite={invite} save={save}>
      <Card>
        <VStack gap={3}>
          <Text color="secondary">Your hero shows up in Turf kingdoms and Rally boss fights. You can change it any time in Activities settings under Character.</Text>
          <HeroPicker value={hero} onChange={setHero} />
        </VStack>
      </Card>
    </StepShell>
  );
}
