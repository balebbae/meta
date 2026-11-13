'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {publicConnection} from '@/lib/activities/connections';
import type {ConnectorId, Platform} from '@/lib/activities/types';
import {ConnectorIcon} from '@/components/icons';
import {startConnector} from '@/lib/activities/connector-start';

export type PublicConnection = ReturnType<typeof publicConnection>;

const AVAIL_LABEL = {ready: null, not_configured: 'Unavailable — not configured', needs_native: 'Coming soon — needs the native app', other_platform: 'Available on iPhone'} as const;

/** Connector hub (§4 step 3 / §5): every source visible, platform-ordered, unavailable ones explain the other route. */
export function ConnectorHub({platform, cards, connections, onConnected, compact}: {platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]; onConnected?: (id: ConnectorId) => void; compact?: boolean}) {
  const router = useRouter();
  const [busy, setBusy] = useState<ConnectorId | null>(null);
  const [note, setNote] = useState<Partial<Record<ConnectorId, string>>>({});
  const byId = new Map(connections.map(c => [c.source, c]));

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
      const result = await startConnector(card.id);
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
    } catch (error) {
      setNote(n => ({...n, [card.id]: error instanceof Error ? error.message : 'Could not connect. Please try again.'}));
    } finally {
      setBusy(null);
    }
  }

  return (
    <List hasDividers>
      {cards.map(card => {
        const conn = byId.get(card.id);
        const connected = conn?.status === 'connected';
        const unavailable = card.availability !== 'ready';
        return (
          <ListItem
            key={card.id}
            startContent={<HStack gap={1} vAlign="center"><ConnectorIcon source={card.id} size={32} />{card.id === 'google_health' && <ConnectorIcon source="fitbit" size={24} />}</HStack>}
            label={
              <HStack gap={1.5} vAlign="center" wrap="wrap">
                <Text weight="bold">{card.label}</Text>
                {connected && <Token label="Connected" size="sm" color="green" />}
                {!connected && unavailable && <Token label={AVAIL_LABEL[card.availability] ?? 'Unavailable'} size="sm" />}
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
