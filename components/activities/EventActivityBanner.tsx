'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import styles from './entry.module.css';

type Meta = {fitness: boolean; bossFight: boolean; questTitle: string | null; friendsGoing: number; names: string[]; allowed: boolean};

/** §3 event entry point: "Boss fight IRL" badge + "Train for this with the N friends who are going" (hidden when N = 0). */
export function EventActivityBanner({eventId}: {eventId: number}) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/activities/events/${eventId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => !cancelled && setMeta(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eventId]);
  if (!meta || !meta.fitness) return null;
  const snooze = async () => {
    setHidden(true);
    await fetch('/api/activities/prompts', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({surface: 'event_train', action: 'snooze'})});
  };
  return (
    <>
      {meta.bossFight && (
        <div>
          <span className={styles.badge}>Boss fight IRL</span>
          <span className={styles.badgeNote}>Moves here count double{meta.questTitle ? ` for ${meta.questTitle}` : ''}</span>
        </div>
      )}
      {meta.friendsGoing > 0 && meta.allowed && !hidden && (
        <div className={styles.banner} role="note">
          <span className={styles.bannerIcon} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 22h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6C13.3 5.4 12.6 5 11.8 5c-.3 0-.5.1-.8.1L5 7.3V12h2V8.6l1.8-.7"/></svg>
          </span>
          <span className={styles.bannerText}>
            Train for this with the <strong>{meta.friendsGoing}</strong> {meta.friendsGoing === 1 ? 'friend who is' : 'friends who are'} going
            {meta.names.length ? ` (${meta.names.join(', ')})` : ''}
          </span>
          <span className={styles.bannerActions}>
            <Link href={`/activities?event=${eventId}`} className={styles.primary}>
              Train with them
            </Link>
            <button type="button" className={styles.ghost} onClick={snooze}>
              Not now
            </button>
          </span>
        </div>
      )}
    </>
  );
}
