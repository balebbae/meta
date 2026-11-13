'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {VaultEvent} from '@/lib/activities/vault';
import {sourceLabel} from '@/lib/activities/source-label';
import styles from './activities.module.css';

export {sourceLabel};

function fmt(e: VaultEvent): string {
  const bits = [e.distanceKm ? `${e.distanceKm} km` : null, e.durationMin ? `${Math.round(e.durationMin)} min` : null, e.steps ? `${e.steps.toLocaleString()} steps` : null, e.avgHr ? `${e.avgHr} bpm avg` : null].filter(Boolean);
  return bits.join(' · ');
}

/** Owner-only vault list with per-source delete (Muse page). */
export function VaultList({events, deletable = true}: {events: VaultEvent[]; deletable?: boolean}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const sources = [...new Set(events.map(e => e.source))];
  const shown = events.filter(e => filter === 'all' || e.source === filter);

  async function wipe(source: string) {
    if (!confirm(`Delete everything ${sourceLabel(source)} put in your vault? Games and friends lose nothing they already saw; your Muse forgets it.`)) return;
    setBusy(source);
    await fetch(`/api/activities/vault?source=${encodeURIComponent(source)}`, {method: 'DELETE'});
    setBusy(null);
    router.refresh();
  }

  if (!events.length) return <p className={styles.sub}>Your vault is empty. Connect a source or log a workout and it shows up here, for your eyes only.</p>;
  return (
    <div>
      <div className={styles.chips} style={{marginBottom: 8}}>
        <button className={filter === 'all' ? styles.chipOn : styles.chip} onClick={() => setFilter('all')}>
          All ({events.length})
        </button>
        {sources.map(s => (
          <button key={s} className={filter === s ? styles.chipOn : styles.chip} onClick={() => setFilter(s)}>
            {sourceLabel(s)} ({events.filter(e => e.source === s).length})
          </button>
        ))}
      </div>
      {deletable && filter !== 'all' && (
        <button className={styles.btnDanger} disabled={busy != null} onClick={() => void wipe(filter)} style={{marginBottom: 6}}>
          {busy === filter ? 'Deleting…' : `Delete all ${sourceLabel(filter)} data from my vault`}
        </button>
      )}
      <ul className={styles.list}>
        {shown.slice(0, 60).map(e => (
          <li key={e.id} className={styles.listItem}>
            <div className={styles.grow}>
              <div className={styles.title} style={{textTransform: 'capitalize'}}>
                {e.kind} <span className={styles.small}>{fmt(e)}</span>
              </div>
              <div className={styles.small}>
                {new Date(e.startedAt).toLocaleString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})} · {sourceLabel(e.source)} · {e.trust.replace('_', ' ')}
                {e.displayScope === 'owner_only' ? ' · only you' : ''}
                {e.duplicateOf ? ` · merged into ${sourceLabel(events.find(x => x.id === e.duplicateOf)?.source ?? 'another')} entry` : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {shown.length > 60 && <div className={styles.small}>Showing the latest 60 of {shown.length}.</div>}
    </div>
  );
}
