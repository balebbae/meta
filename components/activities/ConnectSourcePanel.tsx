'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {FileInput} from '@astryxdesign/core/FileInput';
import type {PublicConnection} from './ConnectorHub';
import {ConnectorIcon} from '@/components/icons';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {ConnectResult} from '@/lib/activities/types';
import h from './home/home.module.css';
import p from './panels/panels.module.css';

type Props = {card: ConnectorCard; connection: PublicConnection | null; eventCount: number; initialResult?: ConnectResult | null; flash?: string | null; onChanged?: () => void};

/** One source in the Settings panel (?panel=settings&tab=sources&source=…): connect / instructions / export upload / replay / disconnect. */
export function ConnectSourcePanel({card, connection, eventCount, initialResult = null, flash, onChanged}: Props) {
  const router = useRouter();
  // inside the Settings panel the caller refetches; router.refresh keeps the hero numbers current
  const refresh = () => {
    router.refresh();
    onChanged?.();
  };
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
      refresh();
    }
  }

  async function disconnect(deleteData: boolean) {
    setBusy('disconnect');
    await post(`/api/connect/${card.id}/disconnect`, {deleteData});
    setBusy(null);
    setConfirmDelete(null);
    setResult(null);
    setMsg(deleteData ? 'Disconnected and vault data deleted.' : 'Disconnected. Vault data kept.');
    refresh();
  }

  async function replay() {
    setBusy('replay');
    const {ok, json} = await post('/api/demo/replay-whoop');
    setBusy(null);
    setMsg(ok ? `Replayed WHOOP webhook ${json.webhook?.type} → ${json.event?.kind} ${json.event?.distanceKm ?? ''} km, ${json.event?.durationMin ?? ''} min, trust verified. Heart rate stays owner-only.` : json.error ?? 'Replay failed');
    refresh();
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
    refresh();
  }

  const primaryLabel = card.mode === 'demo' ? 'Seed demo week' : card.mode === 'shortcut' ? 'Get Shortcut token' : 'Connect';
  const status: [string, string] | null = connected ? ['Connected', p.green] : card.availability === 'not_configured' ? ['Off', ''] : card.availability === 'needs_native' ? ['Soon', p.purple] : card.availability === 'other_platform' ? ['iPhone', p.blue] : null;
  const pill = `${h.pill} ${h.pillSm}`;
  return (
    <div className={p.stack}>
      <div className={p.head}>
        <ConnectorIcon source={card.id} size={40} />
        <div className={p.rowText}>
          <h3>{card.label}</h3>
          <strong>
            {status && <span className={`${p.badge} ${status[1]}`}>{status[0]}</span>}
            {card.trust === 'verified' && <span className={`${p.badge} ${p.purple}`}>Verified</span>}
            {card.ownerOnly && <span className={`${p.badge} ${p.ember}`}>Only you</span>}
            <span className={p.metric}>{eventCount} in vault</span>
          </strong>
        </div>
      </div>
      {msg && <p className={p.note} role="status">{msg}</p>}
      {card.availability !== 'ready' && !connected && card.mode !== 'shortcut' && card.otherRoute && <p className={p.note}>{card.otherRoute}</p>}
      {result?.type === 'unavailable' && <p className={p.error}>{result.reason}</p>}
      {result?.type === 'instructions' && (
        <>
          <p className={p.label}>{result.title}</p>
          <ol className={p.steps}>
            {result.steps.map((s, i) => (
              <li key={i}>{s.includes('Bearer') ? <code>{s}</code> : s}</li>
            ))}
          </ol>
        </>
      )}
      <div className={p.actions}>
        {!connected && (card.availability === 'ready' || card.mode === 'shortcut') && card.mode !== 'builtin' && (
          <button type="button" className={`${pill} ${h.pillBlue}`} disabled={busy != null} onClick={() => void connect()}>
            {busy === 'connect' ? '…' : primaryLabel}
          </button>
        )}
        {connected && card.mode === 'demo' && (
          <button type="button" className={`${pill} ${h.pillBlue}`} disabled={busy != null} onClick={() => void connect()}>
            {busy === 'connect' ? '…' : 'Re-seed week'}
          </button>
        )}
        {connected && card.mode === 'shortcut' && (
          <button type="button" className={`${pill} ${h.pillOutline}`} disabled={busy != null} onClick={() => void connect()}>
            Shortcut steps
          </button>
        )}
        {card.id === 'whoop' && (
          <button type="button" className={`${pill} ${h.pillOutline}`} title="Replays a recorded workout.updated webhook through the real mapper" disabled={busy != null} onClick={() => void replay()}>
            {busy === 'replay' ? '…' : 'Replay webhook'}
          </button>
        )}
        {connected && (
          <button type="button" className={`${pill} ${h.pillOutline}`} disabled={busy != null} onClick={() => setConfirmDelete(false)}>
            Disconnect
          </button>
        )}
      </div>
      {card.id === 'apple_health' && (
        <FileInput label="Or upload export.zip" description="Health app → profile → Export All Health Data" accept=".zip,.xml,application/zip,text/xml" value={null} isLoading={busy === 'upload'} isDisabled={busy != null && busy !== 'upload'} onChange={files => void upload(files)} />
      )}
      {connected && (
        <button type="button" className={`${p.textBtn} ${p.danger}`} disabled={busy != null} onClick={() => setConfirmDelete(true)}>
          Disconnect and delete its data
        </button>
      )}
      {card.id === 'strava' && <p className={p.note}>Strava activities stay visible only to you.</p>}
      <AlertDialog
        isOpen={confirmDelete != null}
        onOpenChange={open => !open && busy !== 'disconnect' && setConfirmDelete(null)}
        title={confirmDelete ? `Disconnect ${card.label} and delete its data?` : `Disconnect ${card.label}?`}
        description={confirmDelete ? 'Everything it put in your vault is deleted too.' : 'Vault data is kept until you delete it.'}
        actionLabel={confirmDelete ? 'Disconnect and delete' : 'Disconnect'}
        onAction={() => void disconnect(Boolean(confirmDelete))}
        isActionLoading={busy === 'disconnect'}
      />
    </div>
  );
}
