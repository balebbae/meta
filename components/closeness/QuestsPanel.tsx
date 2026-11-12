'use client';

import {useCallback, useEffect, useState} from 'react';
import styles from './closeness.module.css';

type Quest = {
  id: number;
  title: string;
  description: string;
  xpReward: number;
  goalType: string;
  goalCount: number;
  status: string;
};

export function QuestsPanel() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/muse/quests/generate', {method: 'POST'});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setQuests(data.quests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={styles.card} aria-label="Weekly closeness quests">
      <div className={styles.heading}>
        <span>Weekly quests</span>
        <button className={styles.btn} type="button" disabled={busy} onClick={() => void load()}>
          {busy ? '…' : 'Refresh'}
        </button>
      </div>
      <div className={styles.sub}>Muse Spark designs challenges that bring you closer to friends.</div>
      {error && <div className={styles.error}>{error}</div>}
      {quests.map(q => (
        <div key={q.id} className={styles.quest}>
          <div className={styles.questTitle}>
            {q.title} · {q.xpReward} XP
          </div>
          <div className={styles.questDesc}>
            {q.description} ({q.goalType} × {q.goalCount}) — {q.status}
          </div>
        </div>
      ))}
    </section>
  );
}
