'use client';
import Link from 'next/link';
import {Flag, Hexagon} from 'lucide-react';
import type {TurfRecapPayload} from '@/lib/activities/types';
import h from '@/components/activities/home/home.module.css';
import type {CardProps} from './index';
import {MemberRing} from './MemberRing';
import styles from './cards.module.css';

/** Muse narration of a finished outing (deterministic result only), or the final standings. */
export default function TurfRecapCard({message}: CardProps) {
  const p = (message.payload ?? {}) as Partial<TurfRecapPayload>;
  const text = p.text ?? message.body;
  const top = Math.max(1, ...(p.standings ?? []).map(s => s.cells));
  return (
    <div className={styles.card} role="group" aria-label={p.final ? 'Turf final standings' : 'Turf recap'}>
      <div className={styles.hero}>
        <span className={styles.glyph} aria-hidden>
          {p.final ? <Flag size={20} /> : <Hexagon size={20} />}
        </span>
        <div className={styles.heroText}>
          <p className={h.eyebrow}>{p.final ? 'Final standings' : 'Turf'}</p>
          {p.title && <div className={styles.title}>{p.title}</div>}
        </div>
        {p.museUsed === false && (
          <span className={h.chip} title="The Muse model is not configured, so this line comes from a template built on the same facts.">
            Muse offline
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        {text}
        {p.standings && p.standings.length > 0 && (
          <div className={styles.rows}>
            {p.standings.map((s, i) => (
              <div key={s.userId} className={styles.row}>
                <MemberRing size={30} color={s.color} pct={(s.cells / top) * 100} label={`${s.name}: ${s.cells} cells`}>
                  <span className={styles.rank}>{i + 1}</span>
                </MemberRing>
                <span className={styles.rowName}>{s.name}</span>
                <span className={styles.rowValue}>
                  {s.cells}
                  <small>cells</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {p.gameId != null && (
        <div className={styles.cardActions}>
          <Link href={`/games/${p.gameId}`} className={`${h.pill} ${h.pillEmber}`}>
            Open map
          </Link>
        </div>
      )}
    </div>
  );
}
