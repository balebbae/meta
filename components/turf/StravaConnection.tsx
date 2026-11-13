'use client';
import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {StravaIcon} from '@/components/icons';
import {stravaConnected} from '@/lib/activities/strava-status';
import styles from './strava.module.css';
import {panelHref} from '@/lib/activities/panel-href';

export function StravaConnection({children}: {children?: ReactNode}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void stravaConnected().then(value => {
        if (alive) { setConnected(value); setError(false); }
      }).catch(() => { if (alive) setError(true); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, []);

  return (
    <div className={styles.connection}>
      {error ? <Link href={panelHref({panel: 'settings', tab: 'sources', source: 'strava'})} className={styles.manage}>Unable to check Strava · Manage connection</Link>
        : connected == null ? <span className={styles.status} role="status">Checking Strava…</span>
        : connected ? <span className={styles.status} role="status"><StravaIcon size={20} /> Strava connected</span>
        : <Link href={panelHref({panel: 'settings', tab: 'sources', source: 'strava'})} className={styles.connect}>
          <StravaIcon size={20} /> Connect Strava
        </Link>}
      {connected && !error && children}
    </div>
  );
}
