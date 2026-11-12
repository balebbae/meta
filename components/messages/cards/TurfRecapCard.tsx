'use client';
import Link from 'next/link';
import type {TurfRecapPayload} from '@/lib/activities/types';
import turf from '@/components/turf/turf.module.css';
import type {CardProps} from './index';
import styles from './cards.module.css';

/** Muse narration of a finished outing (deterministic result only), or the final standings. */
export default function TurfRecapCard({message}: CardProps) {
  const p = (message.payload ?? {}) as Partial<TurfRecapPayload>;
  const text = p.text ?? message.body;
  return (
    <div className={styles.card} role="group" aria-label={p.final ? 'Turf final standings' : 'Turf recap'}>
      <div className={styles.cardHead}>
        <span aria-hidden>{p.final ? '🏁' : '⬢'}</span>
        <span style={{flex: 1, minWidth: 0}}>{p.final ? 'Final standings' : 'Turf'}{p.title ? `: ${p.title}` : ''}</span>
        {p.museUsed === false && (
          <span className={turf.pill} title="The Muse model is not configured, so this line comes from a template built on the same facts.">
            Muse offline
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        {text}
        {p.standings && p.standings.length > 0 && (
          <div style={{marginTop: 8}}>
            {p.standings.map((s, i) => (
              <div key={s.userId} className={turf.legendRow} style={{padding: '3px 0'}}>
                <span className={styles.cardMeta} style={{width: 16}}>
                  {i + 1}
                </span>
                <span className={turf.swatch} style={{background: s.color}} />
                <span className={turf.legendName}>{s.name}</span>
                <span className={turf.legendCells}>
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
          <Link href={`/games/${p.gameId}`} className={styles.btn} style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'}}>
            Open map
          </Link>
        </div>
      )}
    </div>
  );
}
