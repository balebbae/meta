'use client';

import {useState} from 'react';
import {ConnectorIcon} from '@/components/icons';
import type {ConnectorCard} from '@/lib/activities/connectors';
import {useConnect, type PublicConnection} from '../ConnectorHub';
import h from '../home/home.module.css';
import p from './panels.module.css';

// sources /api/connect/[source]/sync can pull from; the rest push (webhooks, Shortcut, export upload)
const SYNCABLE = new Set(['strava', 'whoop']);
const UNAVAILABLE: Record<ConnectorCard['availability'], [string, string] | null> = {ready: null, not_configured: ['Off', p.badge], needs_native: ['Soon', `${p.badge} ${p.purple}`], other_platform: ['iPhone', `${p.badge} ${p.blue}`]};

/** Every source as one row: name + coloured status, one action. Tapping the row opens its detail in the Settings panel. Strava first, then what works here. */
export function SourceList({cards, connections, limit, onChanged}: {cards: ConnectorCard[]; connections: PublicConnection[]; limit?: number; onChanged?: () => void}) {
  const {busy, note, connect, sync, manage} = useConnect(() => onChanged?.());
  const [all, setAll] = useState(false);
  const byId = new Map(connections.map(c => [c.source, c]));
  // manual + photo are logging, not sources: they live in the Logs panel
  const list = cards
    .filter(c => c.id !== 'manual' && c.id !== 'proof_photo')
    .sort((a, b) => Number(b.id === 'strava') - Number(a.id === 'strava') || Number(a.availability !== 'ready') - Number(b.availability !== 'ready'));
  const shown = limit && !all ? list.slice(0, limit) : list;

  return (
    <div className={p.stack}>
      <ul className={p.list}>
        {shown.map(card => {
          const status = byId.get(card.id)?.status;
          const connected = status === 'connected';
          const usable = card.availability === 'ready' || card.mode === 'shortcut';
          const badge: [string, string] | null = connected ? ['Connected', `${p.badge} ${p.green}`] : status === 'error' ? ['Error', `${p.badge} ${p.red}`] : usable ? null : UNAVAILABLE[card.availability];
          const action: {label: string; run: () => void} | null = connected
            ? SYNCABLE.has(card.id)
              ? {label: 'Sync', run: () => void sync(card)}
              : null
            : usable
              ? {label: card.mode === 'demo' ? 'Try demo' : card.mode === 'shortcut' ? 'Set up' : card.mode === 'builtin' ? 'Open' : 'Connect', run: () => void connect(card)}
              : null;
          return (
            <li key={card.id} className={p.row}>
              <button type="button" className={p.rowMain} onClick={() => manage(card)} aria-label={`${card.label} details`}>
                <ConnectorIcon source={card.id} size={28} />
                <span className={p.rowText}>
                  <strong>
                    {card.label}
                    {badge && <span className={badge[1]}>{badge[0]}</span>}
                  </strong>
                  {note[card.id] && <small>{note[card.id]}</small>}
                </span>
              </button>
              {action && (
                <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillBlue}`} disabled={busy != null} onClick={action.run}>
                  {busy === card.id ? '…' : action.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {limit && list.length > limit && (
        <button type="button" className={p.textBtn} onClick={() => setAll(v => !v)} aria-expanded={all}>
          {all ? 'Fewer' : `${list.length - limit} more`}
        </button>
      )}
    </div>
  );
}
