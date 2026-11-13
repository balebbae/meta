'use client';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {LogWorkoutSheet, type LogTab} from './LogWorkoutSheet';

/** /activities/log: opens the sheet immediately (target of the connector hub's "Log a workout" cards). */
export function LogWorkoutPage({initialTab}: {initialTab: LogTab}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);
  return (
    <VStack gap={3} paddingBlock={4}>
      <Heading level={1}>Log a workout</Heading>
      <Text color="secondary">Manual, photo proof or voice. Everything goes to your private vault first.</Text>
      <HStack gap={2} wrap="wrap">
        <Button label="Open the log sheet" variant="primary" onClick={() => setOpen(true)} />
        <Button label="See my vault" href="/activities/muse" />
      </HStack>
      <LogWorkoutSheet open={open} initialTab={initialTab} onClose={() => setOpen(false)} onLogged={() => router.refresh()} />
    </VStack>
  );
}
