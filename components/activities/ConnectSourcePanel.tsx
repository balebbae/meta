'use client';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';
import {SOURCE_ICON, type PublicConnection} from './ConnectorHub';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {ConnectResult} from '@/lib/activities/types';
import styles from './activities.module.css';

type Props = {card: ConnectorCard; connection: PublicConnection | null; eventCount: number; initialResult?: ConnectResult | null; flash?: string | null};

/** /activities/connect/[source]: connect / instructions / export upload / replay / disconnect. */
export function ConnectSourcePanel({card, connection, eventCount, initialResult = null, flash}: Props) {
  const router = useRouter();
  const [result, setResult] = useState<ConnectResult | null>(initialResult);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(flash ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
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
    if (!confirm(deleteData ? `Disconnect ${card.label} and delete its vault data?` : `Disconnect ${card.label}? Vault data is kept.`)) return;
    setBusy('disconnect');
    await post(`/api/connect/${card.id}/disconnect`, {deleteData});
    setBusy(null);
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

  async function upload(file: File | undefined) {
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

  return (
    <>
      <div className={styles.card}>
        <div className={styles.row} style={{marginBottom: 8}}>
          <span className={styles.iconBox} aria-hidden>
            {SOURCE_ICON[card.id]}
          </span>
          <div className={styles.grow}>
            <div className={styles.row} style={{gap: 6}}>
              <span className={styles.title}>{card.label}</span>
              {connected ? <span className={styles.badgeGreen}>Connected</span> : card.availability === 'not_configured' ? <span className={styles.badgeAmber}>Not configured for this demo</span> : card.availability === 'needs_native' ? <span className={styles.badge}>Needs the native app</span> : null}
              {card.trust === 'verified' && <span className={styles.badgeBlue}>Verified trust</span>}
              {card.ownerOnly && <span className={styles.badge}>Shown only to you</span>}
            </div>
            <div className={styles.small}>{card.tagline}</div>
          </div>
        </div>
        {msg && (
          <div className={styles.answerBox} role="status">
            {msg}
          </div>
        )}
        {card.availability !== 'ready' && !connected && card.mode !== 'shortcut' && (
          <p className={styles.sub} style={{marginTop: 10}}>
            {card.otherRoute}
          </p>
        )}
        {result?.type === 'unavailable' && <p className={styles.sub}>{result.reason}</p>}
        {result?.type === 'instructions' && (
          <div style={{marginTop: 10}}>
            <div className={styles.title}>{result.title}</div>
            <ol className={styles.steps}>
              {result.steps.map((s, i) => (
                <li key={i}>{s.includes('Bearer') ? <span className={styles.code}>{s}</span> : s}</li>
              ))}
            </ol>
          </div>
        )}
        <div className={styles.row} style={{marginTop: 12}}>
          {!connected && (card.availability === 'ready' || card.mode === 'shortcut') && card.mode !== 'builtin' && (
            <button className={card.mode === 'demo' ? styles.btnGreen : styles.btnPrimary} disabled={busy != null} onClick={() => void connect()}>
              {busy === 'connect' ? '…' : card.mode === 'demo' ? 'Seed a demo week' : card.mode === 'shortcut' ? 'Get my Shortcut token' : `Connect ${card.label}`}
            </button>
          )}
          {connected && card.mode === 'demo' && (
            <button className={styles.btnGreen} disabled={busy != null} onClick={() => void connect()}>
              {busy === 'connect' ? '…' : 'Re-seed the week'}
            </button>
          )}
          {connected && card.mode === 'shortcut' && (
            <button className={styles.btn} disabled={busy != null} onClick={() => void connect()}>
              Show Shortcut instructions
            </button>
          )}
          {card.id === 'whoop' && (
            <button className={styles.btn} disabled={busy != null} onClick={() => void replay()} title="Replays a recorded workout.updated webhook through the real mapper">
              {busy === 'replay' ? '…' : 'Replay recorded webhook'}
            </button>
          )}
          {connected && (
            <>
              <button className={styles.btn} disabled={busy != null} onClick={() => void disconnect(false)}>
                Disconnect
              </button>
              <button className={styles.btnDanger} disabled={busy != null} onClick={() => void disconnect(true)}>
                Disconnect and delete data
              </button>
            </>
          )}
        </div>
        {card.id === 'apple_health' && (
          <div style={{marginTop: 14}}>
            <div className={styles.title}>Or upload export.zip</div>
            <p className={styles.small}>Health app → your picture → Export All Health Data. We read Workout and StepCount records only; 5 MB cap, nothing is kept but the normalized events.</p>
            <input ref={fileRef} type="file" accept=".zip,.xml,application/zip,text/xml" hidden onChange={e => void upload(e.target.files?.[0])} />
            <button className={styles.btn} disabled={busy != null} onClick={() => fileRef.current?.click()}>
              {busy === 'upload' ? 'Importing…' : 'Choose export.zip / export.xml'}
            </button>
          </div>
        )}
        <p className={styles.small} style={{marginTop: 12}}>
          {eventCount} event{eventCount === 1 ? '' : 's'} from {card.label} in your vault.
          {card.id === 'whoop' && ' WHOOP heart rate and strain are never shared or sent to any model; workouts count as verified.'}
          {card.id === 'strava' && ' Strava activities are shown only to you, per Strava\u2019s API terms; they still count toward your own goals.'}
        </p>
      </div>
    </>
  );
}
