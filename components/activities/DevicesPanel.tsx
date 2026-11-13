'use client';
import {useEffect, useState} from 'react';
import {layoutHealth, type HealthReading} from '@/lib/health-format';
import h from './home/home.module.css';
import p from './panels/panels.module.css';

type Sample = HealthReading & {source: string};
type Summary = {whoop: {userId: string | null; connectedAt: string} | null; samples: Sample[]};

const SOURCES = [
  {id: 'whoop', label: 'Whoop'},
  {id: 'apple_health', label: 'Apple Health'},
  {id: 'health_connect', label: 'Google Health'},
];

declare global {
  interface Window {
    ReactNativeWebView?: {postMessage: (msg: string) => void};
    __onHealthSync?: (result: {ok: boolean; saved?: number; error?: string}) => void;
  }
}

/**
 * Devices (Settings → a phone source): sync Apple Health / Health Connect from the phone app, connect + sync Whoop, and the
 * latest raw readings, collapsed. Every sync also lands in the vault, which is what the level and Coach read.
 */
export function DevicesPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [note, setNote] = useState<{ok: boolean; text: string} | null>(null);
  const [busy, setBusy] = useState<'whoop' | 'phone' | null>(null);
  const [source, setSource] = useState('whoop');
  const [showReadings, setShowReadings] = useState(false);

  const load = () =>
    fetch('/api/health/summary')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setSummary)
      .catch(() => setNote({ok: false, text: 'Could not load readings.'}));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('whoop') === 'connected') setNote({ok: true, text: 'Whoop connected.'});
    if (q.get('whoop') === 'error') setNote({ok: false, text: q.get('msg') ?? 'Whoop connection failed.'});
    void load();
    // the phone app (mobile/App.tsx) calls this after reading Apple Health / Health Connect
    window.__onHealthSync = result => {
      setBusy(null);
      setNote(result.ok ? {ok: true, text: `Synced ${result.saved ?? 0} readings.`} : {ok: false, text: result.error ?? 'Sync failed'});
      if (result.ok) {
        setSource('apple_health');
        void load();
      }
    };
  }, []);

  const syncPhone = async () => {
    if (!window.ReactNativeWebView) {
      setNote({ok: false, text: 'Open Activities in the phone app to sync.'});
      return;
    }
    setBusy('phone');
    const res = await fetch('/api/health/token', {method: 'POST'});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(null);
      setNote({ok: false, text: data.error ?? 'Could not start sync'});
      return;
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'sync-health', token: data.token}));
  };

  const syncWhoop = async () => {
    setBusy('whoop');
    const res = await fetch('/api/whoop/sync', {method: 'POST'});
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setNote(res.ok ? {ok: true, text: `Synced ${data.saved ?? 0} Whoop readings.`} : {ok: false, text: data.error ?? 'Whoop sync failed'});
    if (res.ok) {
      setSource('whoop');
      void load();
    }
  };

  const samples = summary?.samples ?? [];
  const linked = Boolean(summary?.whoop);
  const layout = layoutHealth(samples.filter(x => x.source === source));
  const count = (id: string) => samples.filter(x => x.source === id).length;
  const pill = `${h.pill} ${h.pillSm}`;
  return (
    <div className={p.stack} id="devices">
      <p className={p.label}>Phone &amp; Whoop</p>
      {note && (
        <p className={note.ok ? p.note : p.error} role="status">
          {note.text}
        </p>
      )}
      <div className={p.actions}>
        <button type="button" className={`${pill} ${h.pillBlue}`} disabled={busy != null} onClick={() => void syncPhone()}>
          {busy === 'phone' ? '…' : 'Sync phone'}
        </button>
        {linked && (
          <button type="button" className={`${pill} ${h.pillOutline}`} disabled={busy != null} onClick={() => void syncWhoop()}>
            {busy === 'whoop' ? '…' : 'Sync Whoop'}
          </button>
        )}
        <a className={`${pill} ${h.pillOutline}`} href="/api/whoop/connect">
          {linked ? 'Reconnect Whoop' : 'Connect Whoop'}
        </a>
      </div>
      {samples.length > 0 && (
        <button type="button" className={p.textBtn} aria-expanded={showReadings} onClick={() => setShowReadings(v => !v)}>
          {showReadings ? 'Hide readings' : `Readings ${samples.length}`}
        </button>
      )}
      {showReadings && (
        <>
          <div className={p.pills} role="group" aria-label="Readings source">
            {SOURCES.map(x => (
              <button key={x.id} type="button" className={`${pill} ${source === x.id ? h.pillBlue : h.pillOutline}`} aria-pressed={source === x.id} onClick={() => setSource(x.id)}>
                {x.label} {count(x.id)}
              </button>
            ))}
          </div>
          {layout.sections.length === 0 ? (
            <p className={p.note}>Nothing synced yet.</p>
          ) : (
            layout.sections.map(section => (
              <div key={section.title} className={p.stack}>
                <p className={p.label}>{section.title}</p>
                <ul className={p.list}>
                  {section.rows.map(row => (
                    <li key={row.key} className={p.row}>
                      <span className={p.rowText}>
                        <strong>{row.label}</strong>
                        {row.when && <small>{row.when}</small>}
                      </span>
                      <strong>{row.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
