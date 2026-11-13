'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {CoachState} from '@/lib/activities/coach';
import type {WeekStats} from '@/lib/activities/coach-math';
import styles from './activities.module.css';
import coach from './coach.module.css';

const ROWS: {key: keyof WeekStats; label: string}[] = [
  {key: 'sessions', label: 'Workouts'},
  {key: 'minutes', label: 'Active minutes'},
  {key: 'activeDays', label: 'Active days'},
  {key: 'km', label: 'Distance (km)'},
  {key: 'longestKm', label: 'Longest (km)'},
  {key: 'stepsPerDay', label: 'Steps a day'},
];

/** Coach mode: opt-in toggle, then this week vs last week, improvements, gaps and the Muse's plan to bridge them. */
export function CoachPanel() {
  const [state, setState] = useState<CoachState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (init?: {action: string; deleteHistory?: boolean}) => {
    setBusy(init?.action ?? 'load');
    setError(null);
    try {
      const res = await fetch('/api/activities/coach', init ? {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(init)} : undefined);
      if (!res.ok) throw new Error();
      setState(await res.json());
    } catch {
      setError('Could not reach your Muse. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    void call();
  }, []);

  if (!state) return <div className={styles.card}>{error ?? 'Your Muse is comparing your weeks…'}</div>;

  if (!state.enabled)
    return (
      <div className={styles.card}>
        <h2 className={styles.h2}>Coach mode</h2>
        <p className={styles.small}>Compare my weeks and help me close the gaps. Your Muse uses your synced and logged workouts, rounded, and never your WHOOP numbers.</p>
        <div className={styles.row} style={{marginTop: 10}}>
          <button type="button" className={styles.btnPrimary} disabled={busy != null} onClick={() => void call({action: 'enable'})}>
            {busy === 'enable' ? 'Turning on…' : 'Turn on Coach mode'}
          </button>
        </div>
        {error && <p className={styles.small}>{error}</p>}
      </div>
    );

  const r = state.report;
  return (
    <>
      {state.blocked && <div className={styles.card}>{state.blocked}</div>}
      {r && (
        <>
          <div className={styles.card} style={{borderTop: '4px solid var(--fb-blue)'}}>
            <p className={coach.headline}>{r.headline}</p>
            {r.easyWeek && <p className={styles.small}>Your Muse is keeping next week easy.</p>}
            <div className={coach.compare} style={{marginTop: 10}}>
              <span className={coach.compareHead} />
              <span className={`${coach.compareHead} ${coach.num}`}>This week</span>
              <span className={`${coach.compareHead} ${coach.was}`}>Last week</span>
              {ROWS.filter(row => row.key !== 'km' && row.key !== 'longestKm' && row.key !== 'stepsPerDay' ? true : Boolean(r.thisWeek[row.key] || r.lastWeek[row.key])).map(row => (
                <Row key={row.key} label={row.label} now={r.thisWeek[row.key] as number | null} before={r.lastWeek[row.key] as number | null} />
              ))}
            </div>
            <p className={styles.small} style={{marginTop: 8}}>This week = the last 7 days. Last week = the 7 days before.</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.h2}>Improvements</h2>
            {r.wins.length ? (
              <ul className={coach.list}>
                {r.wins.map(w => (
                  <li key={w.metric} className={coach.up}>
                    {w.label}: {w.this} (was {w.last})
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.small}>Nothing went up this week. That's fine; the plan below starts small.</p>
            )}
            <h2 className={styles.h2} style={{marginTop: 14}}>Gaps</h2>
            {r.gaps.length ? (
              <ul className={coach.list}>
                {r.gaps.map(g => (
                  <li key={g.metric} className={coach.down}>
                    {g.metric === 'rest_days' ? 'No rest day this week' : `${g.label}: ${g.this} (was ${g.last})`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.small}>No gaps: you matched or beat last week everywhere.</p>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.h2}>Bridge the gaps</h2>
            <p className={styles.small}>
              {r.museUsed ? 'Planned by your Muse' : 'Planned from your numbers (Muse offline)'} within safe limits: at most {r.cap.sessions} workouts and about {r.cap.minutes} minutes over the next 7 days.
            </p>
            <div style={{marginTop: 6}}>
              {r.bridge.map((s, i) => (
                <div key={i} className={coach.step}>
                  <span className={coach.stepNum}>{i + 1}</span>
                  <span className={coach.stepTitle}>{s.title}</span>
                  <span className={styles.small}>
                    {s.why}
                    {s.when ? ` · ${s.when}` : ''}
                  </span>
                  {s.href && (
                    <span>
                      <Link href={s.href} className={coach.stepLink}>
                        {s.kind === 'event' ? 'See event' : s.kind === 'ahead' ? 'Ask their Muse' : s.kind === 'rally' ? 'Start a game' : 'Open goal'}
                      </Link>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className={styles.small} style={{marginTop: 8}}>Not medical advice. If something hurts, rest and check with a professional.</p>
          </div>
        </>
      )}
      <div className={styles.row}>
        <button type="button" className={styles.btn} disabled={busy != null || Boolean(state.blocked)} onClick={() => void call({action: 'refresh'})}>
          {busy === 'refresh' ? 'Comparing…' : 'Refresh'}
        </button>
        <button type="button" className={styles.btnText} disabled={busy != null} onClick={() => void call({action: 'disable', deleteHistory: window.confirm('Also delete your past Coach reports?')})}>
          Turn off Coach mode
        </button>
      </div>
      {error && <p className={styles.small}>{error}</p>}
    </>
  );
}

function Row({label, now, before}: {label: string; now: number | null; before: number | null}) {
  const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString());
  return (
    <>
      <span>{label}</span>
      <span className={coach.num}>{fmt(now)}</span>
      <span className={coach.was}>{fmt(before)}</span>
    </>
  );
}
