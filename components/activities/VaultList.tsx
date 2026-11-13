'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {VaultEvent} from '@/lib/activities/vault';
import {sourceLabel} from '@/lib/activities/source-label';

export {sourceLabel};

function fmt(e: VaultEvent): string {
  const bits = [e.distanceKm ? `${e.distanceKm} km` : null, e.durationMin ? `${Math.round(e.durationMin)} min` : null, e.steps ? `${e.steps.toLocaleString()} steps` : null, e.avgHr ? `${e.avgHr} bpm avg` : null].filter(Boolean);
  return bits.join(' · ');
}

/** Owner-only vault list with per-source delete (Muse page). */
export function VaultList({events, deletable = true}: {events: VaultEvent[]; deletable?: boolean}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const sources = [...new Set(events.map(e => e.source))];
  const shown = events.filter(e => filter === 'all' || e.source === filter);

  async function wipe() {
    setBusy(true);
    await fetch(`/api/activities/vault?source=${encodeURIComponent(filter)}`, {method: 'DELETE'});
    setBusy(false);
    setConfirming(false);
    setFilter('all');
    router.refresh();
  }

  if (!events.length) return <EmptyState title="Your vault is empty" description="Connect a source or log a workout and it shows up here, for your eyes only." isCompact />;
  return (
    <VStack gap={3}>
      <HStack gap={1.5} wrap="wrap" aria-label="Filter by source">
        <Token label={`All (${events.length})`} size="sm" color={filter === 'all' ? 'blue' : 'default'} onClick={() => setFilter('all')} />
        {sources.map(s => (
          <Token key={s} label={`${sourceLabel(s)} (${events.filter(e => e.source === s).length})`} size="sm" color={filter === s ? 'blue' : 'default'} onClick={() => setFilter(s)} />
        ))}
      </HStack>
      {deletable && filter !== 'all' && (
        <HStack>
          <Button label={`Delete all ${sourceLabel(filter)} data from my vault`} variant="destructive" size="sm" onClick={() => setConfirming(true)} />
        </HStack>
      )}
      <List hasDividers density="compact">
        {shown.slice(0, 60).map(e => (
          <ListItem
            key={e.id}
            label={
              <Text weight="bold">
                {e.kind.charAt(0).toUpperCase() + e.kind.slice(1)}{' '}
                <Text type="supporting" color="secondary">
                  {fmt(e)}
                </Text>
              </Text>
            }
            description={`${new Date(e.startedAt).toLocaleString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})} · ${sourceLabel(e.source)} · ${e.trust.replace('_', ' ')}${e.displayScope === 'owner_only' ? ' · only you' : ''}${e.duplicateOf ? ` · merged into ${sourceLabel(events.find(x => x.id === e.duplicateOf)?.source ?? 'another')} entry` : ''}`}
          />
        ))}
      </List>
      {shown.length > 60 && (
        <Text type="supporting" color="secondary">
          Showing the latest 60 of {shown.length}.
        </Text>
      )}
      <AlertDialog
        isOpen={confirming}
        onOpenChange={open => !open && !busy && setConfirming(false)}
        title={`Delete everything ${sourceLabel(filter)} put in your vault?`}
        description="Games and friends lose nothing they already saw; your Muse forgets it."
        actionLabel="Delete data"
        onAction={() => void wipe()}
        isActionLoading={busy}
      />
    </VStack>
  );
}
