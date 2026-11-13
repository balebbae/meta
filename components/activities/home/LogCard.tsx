'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {IconCamera, IconCheck, IconX} from '@tabler/icons-react';
import type {ConnectorCard} from '@/lib/activities/connectors';
import type {Platform} from '@/lib/activities/types';
import type {PublicConnection} from '../ConnectorHub';
import {describe, EMPTY, formToLog, KINDS, type Form, type LoggedEvent} from '../LogWorkoutSheet';
import {useJson, usePanelNav} from '../panels/nav';
import {SourceList} from '../panels/SourceList';
import h from './home.module.css';

const SHOWN = 6;
const KIND_PILLS = KINDS.filter(k => k.id !== 'steps');

/** Inline "Log a workout" under the hero's + button: quick manual entry, then the sources that can bring workouts in. */
export function LogCard({onClose}: {onClose: () => void}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<LoggedEvent | null>(null);
  // same cached request as Settings → Sources
  const {data: sources, reload: reloadSources} = useJson<{platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]}>('/api/activities/connections');
  const {open} = usePanelNav();

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

  return (
    <section className={h.logCard} aria-label="Log a workout">
      <div className={h.logHead}>
        <h3 className={h.logTitle}>Log a workout</h3>
        <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillIcon} ${h.pillGhost}`} onClick={onClose} aria-label="Close" title="Close">
          <IconX size={16} aria-hidden />
        </button>
      </div>

      <form onSubmit={save}>
        <div className={h.logKinds} role="group" aria-label="Workout type">
          {KIND_PILLS.map(k => (
            <button key={k.id} type="button" className={`${h.pill} ${h.pillSm} ${form.kind === k.id ? h.pillBlue : h.pillGhost}`} aria-pressed={form.kind === k.id} onClick={() => setForm({...form, kind: k.id})}>
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

      <h4 className={h.logSub}>Or import</h4>
      {sources ? <SourceList cards={sources.cards} connections={sources.connections} limit={SHOWN} onChanged={reloadSources} /> : <p className={h.logNote}>Loading…</p>}
      <div className={h.logFoot}>
        <button type="button" className={h.logLink} onClick={() => open({panel: 'logs', tab: 'photo'})}>
          <IconCamera size={16} aria-hidden /> Photo or voice
        </button>
      </div>
    </section>
  );
}
