'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {FileInput} from '@astryxdesign/core/FileInput';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {List, ListItem} from '@astryxdesign/core/List';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {SOURCE_ICON, type PublicConnection} from './ConnectorHub';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {ConnectResult} from '@/lib/activities/types';

type Props = {card: ConnectorCard; connection: PublicConnection | null; eventCount: number; initialResult?: ConnectResult | null; flash?: string | null};

/** /activities/connect/[source]: connect / instructions / export upload / replay / disconnect. */
export function ConnectSourcePanel({card, connection, eventCount, initialResult = null, flash}: Props) {
  const router = useRouter();
  const [result, setResult] = useState<ConnectResult | null>(initialResult);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(flash ?? null);
  const [confirmDelete, setConfirmDelete] = useState<boolean | null>(null);
  const connected = connection?.status === 'connected';

  async function post(url: string, body?: unknown) {
    const res = await fetch(url, {method: 'POST', headers: body ? {'content-type': 'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined});
    return {ok: res.ok, json: await res.json().catch(() => ({}))};
  }

  async function connect() {
    setBusy('connect');
    const {json} = await post(`/api/connect/${card.id}/start`);
    const r = json.result as ConnectResult | undefined;
    setBusy(null);
    if (!r) return setMsg('Could not start.');
    if (r.type === 'redirect') {
      window.location.href = r.url;
      return;
    }
    setResult(r);
    if (r.type === 'connected') {
      setMsg(card.id === 'mock' ? 'Connected. A realistic week (runs, walks, strength, steps, sleep) is now in your vault.' : 'Connected.');
      router.refresh();
    }
  }

  async function disconnect(deleteData: boolean) {
    setBusy('disconnect');
    await post(`/api/connect/${card.id}/disconnect`, {deleteData});
    setBusy(null);
    setConfirmDelete(null);
    setResult(null);
    setMsg(deleteData ? 'Disconnected and vault data deleted.' : 'Disconnected. Vault data kept.');
    router.refresh();
  }

  async function replay() {
    setBusy('replay');
    const {ok, json} = await post('/api/demo/replay-whoop');
    setBusy(null);
    setMsg(ok ? `Replayed WHOOP webhook ${json.webhook?.type} → ${json.event?.kind} ${json.event?.distanceKm ?? ''} km, ${json.event?.durationMin ?? ''} min, trust verified. Heart rate stays owner-only.` : json.error ?? 'Replay failed');
    router.refresh();
  }

  async function upload(files: File | File[] | null) {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;
    setBusy('upload');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/ingest/apple-health-export', {method: 'POST', body: fd});
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg(res.ok ? `Imported ${j.imported} of ${j.parsed} records from your export.` : j.error ?? 'Upload failed');
    router.refresh();
  }

  const primaryLabel = card.mode === 'demo' ? 'Seed a demo week' : card.mode === 'shortcut' ? 'Get my Shortcut token' : `Connect ${card.label}`;
  return (
    <Card>
      <VStack gap={4}>
        <HStack gap={3} vAlign="center">
          <Icon icon={SOURCE_ICON[card.id]} size="lg" color="accent" />
          <VStack gap={1}>
            <HStack gap={1.5} vAlign="center" wrap="wrap">
              <Heading level={2}>{card.label}</Heading>
              {connected ? <Token label="Connected" size="sm" color="green" /> : card.availability === 'not_configured' ? <Token label="Not configured for this demo" size="sm" color="orange" /> : card.availability === 'needs_native' ? <Token label="Needs the native app" size="sm" /> : null}
              {card.trust === 'verified' && <Token label="Verified trust" size="sm" color="blue" />}
              {card.ownerOnly && <Token label="Shown only to you" size="sm" />}
            </HStack>
            <Text type="supporting" color="secondary">
              {card.tagline}
            </Text>
          </VStack>
        </HStack>
        {msg && <Banner status="info" title={msg} isDismissable onDismiss={() => setMsg(null)} />}
        {card.availability !== 'ready' && !connected && card.mode !== 'shortcut' && <Text color="secondary">{card.otherRoute}</Text>}
        {result?.type === 'unavailable' && <Text color="secondary">{result.reason}</Text>}
        {result?.type === 'instructions' && (
          <VStack gap={2}>
            <Heading level={3}>{result.title}</Heading>
            <List listStyle="decimal" density="compact">
              {result.steps.map((s, i) => (
                <ListItem key={i} label={s.includes('Bearer') ? <Text type="code">{s}</Text> : s} />
              ))}
            </List>
          </VStack>
        )}
        <HStack gap={2} wrap="wrap">
          {!connected && (card.availability === 'ready' || card.mode === 'shortcut') && card.mode !== 'builtin' && <Button label={primaryLabel} variant="primary" isLoading={busy === 'connect'} isDisabled={busy != null && busy !== 'connect'} onClick={() => void connect()} />}
          {connected && card.mode === 'demo' && <Button label="Re-seed the week" variant="primary" isLoading={busy === 'connect'} isDisabled={busy != null && busy !== 'connect'} onClick={() => void connect()} />}
          {connected && card.mode === 'shortcut' && <Button label="Show Shortcut instructions" isDisabled={busy != null} onClick={() => void connect()} />}
          {card.id === 'whoop' && <Button label="Replay recorded webhook" tooltip="Replays a recorded workout.updated webhook through the real mapper" isLoading={busy === 'replay'} isDisabled={busy != null && busy !== 'replay'} onClick={() => void replay()} />}
          {connected && (
            <>
              <Button label="Disconnect" isDisabled={busy != null} onClick={() => setConfirmDelete(false)} />
              <Button label="Disconnect and delete data" variant="destructive" isDisabled={busy != null} onClick={() => setConfirmDelete(true)} />
            </>
          )}
        </HStack>
        {card.id === 'apple_health' && (
          <FileInput
            label="Or upload export.zip"
            description="Health app → your picture → Export All Health Data. We read Workout and StepCount records only; 5 MB cap, nothing is kept but the normalized events."
            accept=".zip,.xml,application/zip,text/xml"
            value={null}
            isLoading={busy === 'upload'}
            isDisabled={busy != null && busy !== 'upload'}
            onChange={files => void upload(files)}
          />
        )}
        <Text type="supporting" color="secondary">
          {eventCount} event{eventCount === 1 ? '' : 's'} from {card.label} in your vault.
          {card.id === 'whoop' && ' WHOOP heart rate and strain are never shared or sent to any model; workouts count as verified.'}
          {card.id === 'strava' && ' Strava activities are shown only to you, per Strava’s API terms; they still count toward your own goals.'}
        </Text>
      </VStack>
      <AlertDialog
        isOpen={confirmDelete != null}
        onOpenChange={open => !open && busy !== 'disconnect' && setConfirmDelete(null)}
        title={confirmDelete ? `Disconnect ${card.label} and delete its data?` : `Disconnect ${card.label}?`}
        description={confirmDelete ? 'Everything it put in your vault is deleted too.' : 'Vault data is kept until you delete it.'}
        actionLabel={confirmDelete ? 'Disconnect and delete' : 'Disconnect'}
        onAction={() => void disconnect(Boolean(confirmDelete))}
        isActionLoading={busy === 'disconnect'}
      />
    </Card>
  );
}
