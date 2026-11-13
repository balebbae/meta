'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {publicConnection} from '@/lib/activities/connections';
import type {ConnectorId} from '@/lib/activities/types';
import {startConnector} from '@/lib/activities/connector-start';
import {usePanelNav} from './panels/nav';

export type PublicConnection = ReturnType<typeof publicConnection>;

/** Connect / sync a source the same way everywhere: OAuth redirect, instant (demo), or its setup page. */
export function useConnect(onConnected?: (id: ConnectorId) => void) {
  const router = useRouter();
  const {open} = usePanelNav();
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
      open({panel: 'logs', tab: card.id === 'proof_photo' ? 'photo' : 'manual'});
      return;
    }
    if (card.mode === 'shortcut') {
      open({panel: 'settings', tab: 'sources', source: card.id});
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
      } else if (result.type === 'instructions') open({panel: 'settings', tab: 'sources', source: card.id});
      else setNote(n => ({...n, [card.id]: result.reason}));
    } catch (error) {
      setNote(n => ({...n, [card.id]: error instanceof Error ? error.message : 'Could not connect. Please try again.'}));
    } finally {
      setBusy(null);
    }
  }

  return {busy, note, connect, sync, manage: (card: ConnectorCard) => open({panel: 'settings', tab: 'sources', source: card.id})};
}
