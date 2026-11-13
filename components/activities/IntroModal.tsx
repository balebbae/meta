'use client';
import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {usePanelNav} from './panels/nav';
// Tabler icons, aliased to the names this file already uses
import {IconBrain as Brain, IconFlag as Flag, IconLock as Lock, IconMap2 as Map, IconTarget as Target, type TablerIcon} from '@tabler/icons-react';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {HStack} from '@astryxdesign/core/HStack';
import h from './home/home.module.css';

export type IntroInvite = {gameId: number; inviterName: string; gameTitle: string; mode?: string};

/**
 * Activities intro (§8). Default variant explains Rally / Turf / Muse and starts onboarding; the invite
 * variant ("Priya invited you to Turf: Katy Trail") runs the minimal flow (tags → privacy) and lands on the game.
 * Escape or the close button = Not now.
 */
export function IntroModal({open, invite, onClose}: {open: boolean; invite?: IntroInvite | null; onClose?: () => void}) {
  const router = useRouter();
  const {open: openPanel} = usePanelNav();
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
    openPanel({panel: 'onboarding', step: 'tags', invite: invite?.gameId});
  }, [close, invite, openPanel]);

  // one short line each; the details live in the steps themselves
  const rows: {icon: TablerIcon; text: string}[] = invite
    ? [
        {icon: Flag, text: 'Pick what you’re into'},
        {icon: Lock, text: 'Choose what the game can see'},
      ]
    : [
        {icon: Target, text: 'Rally: boss fights with friends'},
        {icon: Map, text: 'Turf: claim streets on real runs'},
        {icon: Brain, text: 'Muse: your private coach'},
      ];

  return (
    <Dialog isOpen={visible} onOpenChange={o => !o && busy == null && void snooze()} width={400}>
      <Layout
        header={<DialogHeader title={invite ? `${invite.inviterName} invited you to ${invite.gameTitle}` : 'Activities'} subtitle={invite ? 'Two quick steps to join.' : 'Move more with friends.'} onOpenChange={() => void snooze()} />}
        content={
          <LayoutContent padding={6}>
            <ul className={h.introRows}>
              {rows.map(r => (
                <li key={r.text}>
                  <Icon icon={r.icon} size="md" color="accent" />
                  {r.text}
                </li>
              ))}
            </ul>
          </LayoutContent>
        }
        footer={
          <LayoutFooter padding={6}>
            <HStack gap={2} hAlign="end">
              <button type="button" className={`${h.pill} ${h.pillOutline}`} disabled={busy != null} onClick={() => void snooze()}>
                {busy === 'snooze' ? '…' : 'Not now'}
              </button>
              <button type="button" className={`${h.pill} ${h.pillBlue}`} disabled={busy != null} onClick={() => void start()}>
                {busy === 'start' ? '…' : invite ? 'Accept' : 'Get started'}
              </button>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
