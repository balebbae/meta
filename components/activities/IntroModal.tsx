'use client';
import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
// Tabler icons, aliased to the names this file already uses
import {IconBrain as Brain, IconFlag as Flag, IconLock as Lock, IconMap2 as Map, IconTarget as Target, type TablerIcon} from '@tabler/icons-react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';

export type IntroInvite = {gameId: number; inviterName: string; gameTitle: string; mode?: string};

/**
 * Activities intro (§8). Default variant explains Rally / Turf / Muse and starts onboarding; the invite
 * variant ("Priya invited you to Turf: Katy Trail") runs the minimal flow (tags → privacy) and lands on the game.
 * Escape or the close button = Not now.
 */
export function IntroModal({open, invite, onClose}: {open: boolean; invite?: IntroInvite | null; onClose?: () => void}) {
  const router = useRouter();
  const [visible, setVisible] = useState(open);
  const [busy, setBusy] = useState<'start' | 'snooze' | null>(null);
  useEffect(() => setVisible(open), [open]);

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const snooze = useCallback(async () => {
    setBusy('snooze');
    await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'snooze'})}).catch(() => {});
    setBusy(null);
    close();
    router.refresh();
  }, [close, router]);

  const start = useCallback(async () => {
    setBusy('start');
    await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'})}).catch(() => {});
    setBusy(null);
    close();
    router.push(invite ? `/activities/onboarding/tags?invite=${invite.gameId}` : '/activities/onboarding/tags');
  }, [close, invite, router]);

  const bullets: {icon: TablerIcon; title: string; body: string}[] = invite
    ? [
        {icon: Flag, title: invite.gameTitle, body: `${invite.inviterName} picked you. Accepting takes two quick steps: what you're into, and what your Muse may share.`},
        {icon: Lock, title: 'Your data stays yours', body: 'The game only ever sees what you allow. Routes and heart rate never leave your vault unless you say so.'},
        {icon: Brain, title: 'Your Muse keeps score', body: 'It answers the game’s questions at the precision you choose, and logs every question for you to read.'},
      ]
    : [
        {icon: Target, title: 'Rally', body: 'Boss fights, relays and streaks with friends in Messenger. Your Muse scales the targets to each person so nobody is the weak link.'},
        {icon: Map, title: 'Turf', body: 'Claim ground by walking or running real streets. Teams, arenas, trash talk. Phone in pocket.'},
        {icon: Brain, title: 'Your Muse', body: 'A private agent that knows your workouts, keeps the raw data in your vault, and only tells others what you allow.'},
      ];

  return (
    <Dialog isOpen={visible} onOpenChange={o => !o && busy == null && void snooze()} width={520}>
      <Layout
        header={
          <DialogHeader
            title={invite ? `${invite.inviterName} invited you to ${invite.gameTitle}` : 'Activities'}
            subtitle={invite ? 'Join the game in about a minute.' : 'The place where your friends make you move.'}
            onOpenChange={() => void snooze()}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={3}>
              <List>
                {bullets.map(b => (
                  <ListItem key={b.title} align="start" startContent={<Icon icon={b.icon} size="md" color="accent" />} label={<Text weight="bold">{b.title}</Text>} description={b.body} />
                ))}
              </List>
              <Text type="supporting" color="secondary">
                No wearable needed: use a photo of your treadmill or just tell your Muse what you did. You can change any sharing choice later under Activities → Privacy.
              </Text>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <VStack gap={2}>
              <Button label={invite ? 'Accept and set up' : 'Get started'} variant="primary" width="100%" isLoading={busy === 'start'} isDisabled={busy === 'snooze'} onClick={() => void start()} />
              <Button label="Not now" width="100%" isLoading={busy === 'snooze'} isDisabled={busy === 'start'} onClick={() => void snooze()} />
            </VStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
