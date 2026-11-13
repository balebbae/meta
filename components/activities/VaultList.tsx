'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import type {VaultEvent} from '@/lib/activities/vault';
import {sourceLabel} from '@/lib/activities/source-label';
import h from './home/home.module.css';
import p from './panels/panels.module.css';

export {sourceLabel};

const TRUST: Record<string, [string, string]> = {verified: ['Verified', p.green], device: ['Device', p.blue], photo: ['Photo', p.purple], self_reported: ['Self', '']};

function fmt(e: VaultEvent): string {
  const bits = [e.distanceKm ? `${e.distanceKm} km` : null, e.durationMin ? `${Math.round(e.durationMin)} min` : null, e.steps ? `${e.steps.toLocaleString()} steps` : null, e.avgHr ? `${e.avgHr} bpm` : null].filter(Boolean);
  return bits.join(' · ');
}

/** Owner-only vault list (Logs panel): source filter pills, one row per entry, per-source delete. onChanged refetches the caller's list. */
export function VaultList({events, deletable = true, onChanged}: {events: VaultEvent[]; deletable?: boolean; onChanged?: () => void}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
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
    onChanged?.();
  }

  if (!events.length) return <p className={p.note}>No workouts yet.</p>;
  const chip = (id: string, label: string, n: number) => (
    <button key={id} type="button" className={`${h.pill} ${h.pillSm} ${filter === id ? h.pillBlue : h.pillOutline}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>
      {label} {n}
    </button>
  );
  return (
    <div className={p.stack}>
      <div className={p.pills} role="group" aria-label="Filter by source">
        {chip('all', 'All', events.length)}
        {sources.map(s => chip(s, sourceLabel(s), events.filter(e => e.source === s).length))}
      </div>
      <ul className={p.list}>
        {(all ? shown : shown.slice(0, 60)).map(e => {
          const trust = TRUST[e.trust] ?? [e.trust, ''];
          return (
            <li key={e.id} className={p.row}>
              <span className={p.rowText}>
                <strong>
                  {e.kind.charAt(0).toUpperCase() + e.kind.slice(1)} <span className={p.metric}>{fmt(e)}</span>
                </strong>
                <small>
                  {new Date(e.startedAt).toLocaleString(undefined, {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})} · {sourceLabel(e.source)}
                  {e.duplicateOf ? ' · merged' : ''}
                </small>
              </span>
              <span className={`${p.badge} ${trust[1]}`}>{trust[0]}</span>
            </li>
          );
        })}
      </ul>
      {shown.length > 60 && !all && (
        <button type="button" className={p.textBtn} onClick={() => setAll(true)}>
          Show all {shown.length}
        </button>
      )}
      {deletable && filter !== 'all' && (
        <button type="button" className={`${p.textBtn} ${p.danger}`} onClick={() => setConfirming(true)}>
          Delete all {sourceLabel(filter)} data
        </button>
      )}
      <AlertDialog
        isOpen={confirming}
        onOpenChange={open => !open && !busy && setConfirming(false)}
        title={`Delete everything ${sourceLabel(filter)} put in your vault?`}
        description="Your Muse forgets it. Games and friends keep only what they already saw."
        actionLabel="Delete data"
        onAction={() => void wipe()}
        isActionLoading={busy}
      />
    </div>
  );
}
