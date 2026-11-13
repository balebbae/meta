'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {IconCamera, IconCheck, IconX} from '@tabler/icons-react';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {Platform} from '@/lib/activities/types';
import {AVAIL_LABEL, SOURCE_ICON, useConnect, type PublicConnection} from '../ConnectorHub';
import {describe, EMPTY, formToLog, KINDS, type Form, type LoggedEvent} from '../LogWorkoutSheet';
import h from './home.module.css';

// sources /api/connect/[source]/sync can pull from; the rest push (webhooks, Shortcut, export upload)
const SYNCABLE = new Set(['strava', 'whoop']);
const SHOWN = 6;
const KIND_PILLS = KINDS.filter(k => k.id !== 'steps');

/** Inline "Log a workout" under the hero's + button: quick manual entry, then the sources that can bring workouts in. */
export function LogCard({onClose}: {onClose: () => void}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<LoggedEvent | null>(null);
  const [sources, setSources] = useState<{platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]} | null>(null);
  const [allSources, setAllSources] = useState(false);
  const {busy: srcBusy, note, connect, sync} = useConnect();

  useEffect(() => {
    fetch('/api/activities/connections')
      .then(r => (r.ok ? r.json() : null))
      .then(setSources)
      .catch(() => setSources(null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/activities/log', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({log: formToLog(form)})});
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? 'Could not save');
    setSaved({...j.event, flags: j.flags});
    setForm({...EMPTY, kind: form.kind});
    router.refresh();
  }

  const conn = new Map(sources?.connections.map(c => [c.source, c]));
  // Strava first, then what works here, then the rest (manual + photo are this card and its footer link)
  const cards = (sources?.cards ?? [])
    .filter(c => c.id !== 'manual' && c.id !== 'proof_photo')
    .sort((a, b) => Number(b.id === 'strava') - Number(a.id === 'strava') || Number(a.availability !== 'ready') - Number(b.availability !== 'ready'));
  const shown = allSources ? cards : cards.slice(0, SHOWN);

  return (
    <section className={h.logCard} aria-label="Log a workout">
      <div className={h.logHead}>
        <h3 className={h.logTitle}>Log a workout</h3>
        <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillIcon}`} onClick={onClose} aria-label="Close" title="Close">
          <IconX size={16} aria-hidden />
        </button>
      </div>

      <form onSubmit={save}>
        <div className={h.logKinds} role="group" aria-label="Workout type">
          {KIND_PILLS.map(k => (
            <button key={k.id} type="button" className={`${h.pill} ${h.pillSm} ${form.kind === k.id ? h.pillBlue : ''}`} aria-pressed={form.kind === k.id} onClick={() => setForm({...form, kind: k.id})}>
              {k.label}
            </button>
          ))}
        </div>
        <div className={h.logFields}>
          <label className={h.logField}>
            <span>Distance (km)</span>
            <input inputMode="decimal" placeholder="5" value={form.distanceKm} onChange={e => setForm({...form, distanceKm: e.target.value})} />
          </label>
          <label className={h.logField}>
            <span>Duration (min)</span>
            <input inputMode="numeric" placeholder="30" value={form.durationMin} onChange={e => setForm({...form, durationMin: e.target.value})} />
          </label>
          <button type="submit" className={`${h.pill} ${h.pillBlue}`} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
        {err && (
          <p className={h.logError} role="alert">
            {err}
          </p>
        )}
        {saved && !err && (
          <p className={h.logDone} role="status">
            <IconCheck size={16} aria-hidden /> Saved {describe(saved)}
            {saved.duplicateOf ? ', merged with a workout already in your vault' : ''}
            {saved.flags?.length ? ` (flagged: ${saved.flags.join('; ')})` : ''}
          </p>
        )}
      </form>

      <h4 className={h.logSub}>Or bring it in</h4>
      {!sources ? (
        <p className={h.logNote}>Loading sources…</p>
      ) : (
        <ul className={h.logSources}>
          {shown.map(card => {
            const Icon = SOURCE_ICON[card.id];
            const connected = conn.get(card.id)?.status === 'connected';
            const ready = card.availability === 'ready';
            const manage = `/activities/connect/${card.id}`;
            return (
              <li key={card.id} className={h.logSource}>
                <Icon size={22} aria-hidden />
                <span className={h.logSourceText}>
                  <strong>{card.label}</strong>
                  <small>{note[card.id] ?? (connected ? 'Connected' : ready || card.mode === 'shortcut' ? card.tagline : AVAIL_LABEL[card.availability])}</small>
                </span>
                {connected && SYNCABLE.has(card.id) ? (
                  <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillBlue}`} disabled={srcBusy != null} onClick={() => void sync(card)}>
                    {srcBusy === card.id ? 'Syncing…' : 'Sync'}
                  </button>
                ) : connected || (!ready && card.mode !== 'shortcut') ? (
                  <Link className={`${h.pill} ${h.pillSm}`} href={manage}>
                    {connected ? 'Manage' : 'How'}
                  </Link>
                ) : (
                  <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillBlue}`} disabled={srcBusy != null} onClick={() => void connect(card)}>
                    {srcBusy === card.id ? 'Connecting…' : card.mode === 'demo' ? 'Try demo' : card.mode === 'shortcut' ? 'Set up' : card.mode === 'builtin' ? 'Open' : 'Connect'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className={h.logFoot}>
        <Link className={h.logLink} href="/activities/log?tab=photo">
          <IconCamera size={16} aria-hidden /> Photo proof or voice
        </Link>
        {cards.length > SHOWN && (
          <button type="button" className={h.logLink} onClick={() => setAllSources(v => !v)} aria-expanded={allSources}>
            {allSources ? 'Fewer sources' : `${cards.length - SHOWN} more sources`}
          </button>
        )}
      </div>
    </section>
  );
}
