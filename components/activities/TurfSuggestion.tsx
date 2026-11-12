'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import styles from './entry.module.css';

/** §3 composer entry point: after a "Working out" / "Running" post → "Turn this run into a Turf game with friends?" */
export function TurfSuggestion({activity, onDismiss}: {activity: string; onDismiss: () => void}) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    fetch('/api/activities/prompts?surfaces=composer_turf')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.allowed?.composer_turf) {
          setAllowed(true);
          void fetch('/api/activities/prompts', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({surface: 'composer_turf', action: 'shown'})});
        }
      })
      .catch(() => {});
  }, []);
  if (!allowed) return null;
  const noun = activity === 'Running' ? 'run' : 'workout';
  const snooze = async () => {
    onDismiss();
    await fetch('/api/activities/prompts', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({surface: 'composer_turf', action: 'snooze'})});
  };
  return (
    <div className={styles.card} role="note">
      <span className={styles.bannerIcon} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
      </span>
      <div style={{flex: 1}}>
        <div className={styles.cardTitle}>Turn this {noun} into a Turf game with friends?</div>
        <div className={styles.cardSub}>Claim the streets you {noun === 'run' ? 'run' : 'train on'} this week. Nobody sees your route, only the blocks you own.</div>
      </div>
      <div className={styles.bannerActions}>
        <Link href="/activities?start=turf" className={styles.primary}>
          Start Turf
        </Link>
        <button type="button" className={styles.ghost} onClick={snooze}>
          Not now
        </button>
      </div>
    </div>
  );
}
