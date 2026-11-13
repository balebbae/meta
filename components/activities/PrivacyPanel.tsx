'use client';
import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import type {PolicyMatrix} from '@/lib/activities/policies';
import {AnswerPreview} from './AnswerPreview';
import {PrivacyMatrix} from './PrivacyMatrix';

/** Matrix + live preview wired together so a policy change immediately re-asks the Muse (§14). */
export function PrivacyPanel({initial, showPreview = true}: {initial: PolicyMatrix; showPreview?: boolean}) {
  const [tick, setTick] = useState(0);
  return (
    <>
      <Card>
        <VStack gap={3}>
          <VStack gap={1}>
            <Heading level={2}>What your Muse may say, to whom</Heading>
            <Text type="supporting" color="secondary">
              Open a category to set a level per audience. Exact, rounded, yes/no, Muse-only (it uses the data for your plan but never states it), or nothing.
            </Text>
          </VStack>
          <PrivacyMatrix initial={initial} onChange={() => setTick(t => t + 1)} />
        </VStack>
      </Card>
      {showPreview && (
        <Card>
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={2}>Try it</Heading>
              <Text type="supporting" color="secondary">
                This is the exact call games, Discover and other people&apos;s Muses make. Flip Heart rate above and watch the answer change.
              </Text>
            </VStack>
            <AnswerPreview refreshKey={tick} />
          </VStack>
        </Card>
      )}
    </>
  );
}
