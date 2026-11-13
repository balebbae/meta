'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
// Tabler icons, aliased to the names this file already uses
import {IconActivity as Activity, IconBrandApple as Apple, IconBrandStrava as Strava, IconCamera as Camera, IconCircleDot as CircleDot, IconHeartbeat as HeartPulse, IconStack2 as Layers, IconPencil as Pencil, IconDeviceMobile as Smartphone, IconDeviceWatch as Watch, type TablerIcon} from '@tabler/icons-react';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {publicConnection} from '@/lib/activities/connections';
import type {ConnectResult, ConnectorId, Platform} from '@/lib/activities/types';

export type PublicConnection = ReturnType<typeof publicConnection>;

export const SOURCE_ICON: Record<ConnectorId, TablerIcon> = {
  apple_health: Apple, health_connect: HeartPulse, google_health: Activity, strava: Strava, oura: CircleDot, whoop: Watch, garmin: Watch, aggregator: Layers, phone_steps: Smartphone, proof_photo: Camera, manual: Pencil, mock: Watch,
};

export const AVAIL_LABEL = {ready: null, not_configured: 'Not configured for this demo', needs_native: 'Needs the native app', other_platform: 'Open on your iPhone'} as const;

/** Connect / sync a source the same way everywhere: OAuth redirect, instant (demo), or its setup page. */
export function useConnect(onConnected?: (id: ConnectorId) => void) {
  const router = useRouter();
  const [busy, setBusy] = useState<ConnectorId | null>(null);
  const [note, setNote] = useState<Partial<Record<ConnectorId, string>>>({});

  async function sync(card: ConnectorCard) {
    setBusy(card.id);
    try {
      const res = await fetch(`/api/connect/${card.id}/sync`, {method: 'POST'});
      const j = (await res.json().catch(() => ({}))) as {imported?: number; error?: string};
      setNote(n => ({...n, [card.id]: res.ok ? `Synced: ${j.imported ?? 0} new from ${card.label}.` : (j.error ?? 'Sync failed.')}));
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function connect(card: ConnectorCard) {
    if (card.id === 'manual' || card.id === 'proof_photo') {
      router.push('/activities/log' + (card.id === 'proof_photo' ? '?tab=photo' : ''));
      return;
    }
    if (card.mode === 'shortcut') {
      router.push(`/activities/connect/${card.id}`);
      return;
    }
    setBusy(card.id);
    try {
      const res = await fetch(`/api/connect/${card.id}/start`, {method: 'POST'});
      const {result} = (await res.json()) as {result: ConnectResult};
      if (result.type === 'redirect') {
        window.location.href = result.url;
        return;
      }
      if (result.type === 'connected') {
        setNote(n => ({...n, [card.id]: card.id === 'mock' ? 'Connected. A week of runs, walks, strength, steps and sleep is in your vault.' : 'Connected.'}));
        onConnected?.(card.id);
        router.refresh();
      } else if (result.type === 'instructions') router.push(`/activities/connect/${card.id}`);
      else setNote(n => ({...n, [card.id]: result.reason}));
    } finally {
      setBusy(null);
    }
  }

  return {busy, note, connect, sync};
}

/** Connector hub (§4 step 3 / §5): every source visible, platform-ordered, unavailable ones explain the other route. */
export function ConnectorHub({platform, cards, connections, onConnected, compact}: {platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]; onConnected?: (id: ConnectorId) => void; compact?: boolean}) {
  const {busy, note, connect} = useConnect(onConnected);
  const byId = new Map(connections.map(c => [c.source, c]));

  return (
    <List hasDividers>
      {cards.map(card => {
        const conn = byId.get(card.id);
        const connected = conn?.status === 'connected';
        const unavailable = card.availability !== 'ready';
        return (
          <ListItem
            key={card.id}
            startContent={<Icon icon={SOURCE_ICON[card.id]} size="md" color="secondary" />}
            label={
              <HStack gap={1.5} vAlign="center" wrap="wrap">
                <Text weight="bold">{card.label}</Text>
                {connected && <Token label="Connected" size="sm" color="green" />}
                {card.trust === 'verified' && <Token label="Verified" size="sm" color="blue" />}
                {card.ownerOnly && <Token label="Only you" size="sm" />}
                {card.id === 'apple_health' && platform === 'ios' && <Token label="Your phone" size="sm" color="blue" />}
              </HStack>
            }
            description={note[card.id] ?? (unavailable && !connected ? `${AVAIL_LABEL[card.availability]}. ${card.otherRoute ?? ''}` : card.tagline)}
            endContent={
              connected ? (
                <Button label="Manage" size="sm" href={`/activities/connect/${card.id}`} />
              ) : unavailable && card.mode !== 'shortcut' ? (
                <Button label={compact ? 'Info' : 'Why?'} size="sm" variant="ghost" href={`/activities/connect/${card.id}`} tooltip={`About ${card.label}`} />
              ) : (
                <Button
                  label={card.mode === 'demo' ? 'Try demo' : card.mode === 'builtin' ? 'Open' : card.mode === 'shortcut' ? 'Set up' : 'Connect'}
                  size="sm"
                  variant="primary"
                  isLoading={busy === card.id}
                  isDisabled={busy != null && busy !== card.id}
                  onClick={() => void connect(card)}
                />
              )
            }
          />
        );
      })}
    </List>
  );
}
