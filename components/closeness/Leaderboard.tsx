'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import styles from './closeness.module.css';

type Row = {userId: number; name: string; avatarUrl: string; xp: number};

export function Leaderboard({compact = false, defaultTab = 'closeness'}: {compact?: boolean; defaultTab?: 'closeness' | 'fitness'}) {
  const [tab, setTab] = useState(defaultTab);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(tab === 'fitness' ? '/api/leaderboard?tab=fitness' : '/api/leaderboard')
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
        return res.json() as Promise<{rows: Row[]}>;
      })
      .then(data => {
        if (!cancelled) setRows(data.rows ?? []);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <section className={styles.board} aria-label="Leaderboard">
      <div className={styles.heading}>
        <span>{tab === 'fitness' ? 'Fitness this week' : 'Closeness this week'}</span>
        {!compact && <Link href={tab === 'fitness' ? '/activities' : '/closeness'}>See all</Link>}
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Leaderboard type">
        {(['closeness', 'fitness'] as const).map(t => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? styles.tabOn : styles.tab} onClick={() => setTab(t)}>
            {t === 'fitness' ? 'Fitness' : 'Closeness'}
          </button>
        ))}
      </div>
      <div className={styles.sub}>{tab === 'fitness' ? 'Rally XP from real moves this week. Only who moved, never how far or how fast.' : 'XP for meaningful contact — comments, voice notes, check-ins.'}</div>
      {error && <div className={styles.error}>{error}</div>}
      {rows.slice(0, compact ? 5 : 20).map((r, i) => (
        <Link key={r.userId} href={`/profile/${r.userId}`} className={styles.row}>
          <span className={styles.rank}>{i + 1}</span>
          <Avatar src={r.avatarUrl} alt="" size={36} />
          <span className={styles.meta}>
            <div className={styles.name}>{r.name}</div>
          </span>
          <span className={styles.xp}>{r.xp} XP</span>
        </Link>
      ))}
      {!error && rows.length === 0 && <div className={styles.error}>{tab === 'fitness' ? 'No Rally XP yet — make a move in a quest.' : 'No XP yet — react or leave a voice note.'}</div>}
    </section>
  );
}
