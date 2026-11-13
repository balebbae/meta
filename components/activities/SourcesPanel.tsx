'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import type {PublicConnection} from './ConnectorHub';
import {ConnectorIcon} from '@/components/icons';
import {sourceLabel} from './VaultList';

type Pending = {source: string; action: 'wipe' | 'revoke'};

/** Connected sources with "revoke" and "delete vault data" per source (privacy + Muse pages). */
export function SourcesPanel({connections, counts}: {connections: PublicConnection[]; counts: Record<string, number>}) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const sources = [...new Set([...connections.filter(c => c.status !== 'revoked').map(c => c.source), ...Object.keys(counts)])];

  async function apply() {
    if (!pending) return;
    setBusy(true);
    if (pending.action === 'wipe') await fetch(`/api/activities/vault?source=${encodeURIComponent(pending.source)}`, {method: 'DELETE'});
    else await fetch(`/api/connect/${pending.source}/disconnect`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({deleteData: false})});
    setBusy(false);
    setPending(null);
    router.refresh();
  }

  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" justify="between">
          <Heading level={2}>Sources</Heading>
          <Button label="Add a source" variant="ghost" size="sm" href="/activities/connect" />
        </HStack>
        {sources.length === 0 ? (
          <EmptyState title="No sources yet" description="Connect a watch or app, or log a workout by hand." isCompact />
        ) : (
          <List hasDividers>
            {sources.map(s => {
              const c = connections.find(x => x.source === s);
              const n = counts[s] ?? 0;
              return (
                <ListItem
                  key={s}
                  startContent={<ConnectorIcon source={s} size={32} />}
                  label={
                    <HStack gap={1.5} vAlign="center">
                      <Text weight="bold">{sourceLabel(s)}</Text>
                      {c?.status === 'connected' && <Token label="Connected" size="sm" color="green" />}
                      {c?.status === 'error' && <Token label="Error" size="sm" color="orange" />}
                    </HStack>
                  }
                  description={`${n} event${n === 1 ? '' : 's'} in your vault${c?.lastSync ? ` · synced ${new Date(c.lastSync).toLocaleDateString()}` : ''}`}
                  endContent={
                    <HStack gap={1}>
                      {n > 0 && <Button label="Delete data" variant="destructive" size="sm" onClick={() => setPending({source: s, action: 'wipe'})} />}
                      {c?.status === 'connected' && s !== 'manual' && s !== 'proof_photo' && <Button label="Revoke" size="sm" onClick={() => setPending({source: s, action: 'revoke'})} />}
                    </HStack>
                  }
                />
              );
            })}
          </List>
        )}
      </VStack>
      <AlertDialog
        isOpen={pending != null}
        onOpenChange={open => !open && !busy && setPending(null)}
        title={pending?.action === 'wipe' ? `Delete all ${sourceLabel(pending.source)} data?` : `Disconnect ${pending ? sourceLabel(pending.source) : ''}?`}
        description={pending?.action === 'wipe' ? 'Everything it put in your vault is deleted. Games and friends lose nothing they already saw; your Muse forgets it.' : 'Its data stays in your vault until you delete it.'}
        actionLabel={pending?.action === 'wipe' ? 'Delete data' : 'Disconnect'}
        onAction={() => void apply()}
        isActionLoading={busy}
      />
    </Card>
  );
}
