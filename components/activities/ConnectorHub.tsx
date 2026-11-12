'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {publicConnection} from '@/lib/activities/connections';
import type {ConnectResult, ConnectorId, Platform} from '@/lib/activities/types';
import styles from './activities.module.css';

export type PublicConnection = ReturnType<typeof publicConnection>;

export const SOURCE_ICON: Record<ConnectorId, string> = {
  apple_health: '', health_connect: '🫀', google_health: 'G', strava: 'S', oura: 'O', whoop: 'W', garmin: '▲', aggregator: '∑', phone_steps: '📱', proof_photo: '📷', manual: '✍️', mock: '⌚',
};

const AVAIL_LABEL = {ready: null, not_configured: 'Not configured for this demo', needs_native: 'Needs the native app', other_platform: 'Open on your iPhone'} as const;

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

  return (
    <ul className={styles.list}>
      {cards.map(card => {
        const conn = byId.get(card.id);
        const connected = conn?.status === 'connected';
        const unavailable = card.availability !== 'ready';
        return (
          <li key={card.id} className={styles.listItem}>
            <span className={styles.iconBox} aria-hidden>
              {SOURCE_ICON[card.id]}
            </span>
            <div className={styles.grow}>
              <div className={styles.row} style={{gap: 6}}>
                <Link href={`/activities/connect/${card.id}`} className={styles.title} style={{color: 'inherit', textDecoration: 'none'}}>
                  {card.label}
                </Link>
                {connected && <span className={styles.badgeGreen}>Connected</span>}
                {card.trust === 'verified' && <span className={styles.badgeBlue}>Verified</span>}
                {card.ownerOnly && <span className={styles.badge}>Only you</span>}
                {card.id === 'apple_health' && platform === 'ios' && <span className={styles.badgeBlue}>Your phone</span>}
              </div>
              <div className={styles.small}>{note[card.id] ?? (unavailable && !connected ? `${AVAIL_LABEL[card.availability]}. ${card.otherRoute ?? ''}` : card.tagline)}</div>
            </div>
            {connected ? (
              <Link href={`/activities/connect/${card.id}`} className={styles.btn}>
                Manage
              </Link>
            ) : unavailable && card.mode !== 'shortcut' ? (
              <Link href={`/activities/connect/${card.id}`} className={styles.btn} aria-label={`About ${card.label}`}>
                {compact ? 'Info' : 'Why?'}
              </Link>
            ) : (
              <button className={card.mode === 'demo' ? styles.btnGreen : styles.btnPrimary} disabled={busy != null} onClick={() => void connect(card)}>
                {busy === card.id ? '…' : card.mode === 'demo' ? 'Try demo' : card.mode === 'builtin' ? 'Open' : card.mode === 'shortcut' ? 'Set up' : 'Connect'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
