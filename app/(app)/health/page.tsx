'use client';

import {useEffect, useState} from 'react';
import buttons from '@/components/closeness/closeness.module.css';
import {layoutHealth, type HealthReading} from '@/lib/health-format';
import styles from './health.module.css';

type Sample = HealthReading & {source: string};
type Summary = {whoop: {userId: string | null; connectedAt: string} | null; samples: Sample[]};

const SOURCES = [
  {source: 'apple_health', title: 'Apple Health', hint: 'Activity is the last 24 hours. Heart, body, and vitals are the latest reading on this iPhone. Workouts are the last 14 days.'},
  {source: 'health_connect', title: 'Google Health', hint: 'The same readings from Health Connect, when an Android phone syncs.'},
];

declare global {
  interface Window {
    ReactNativeWebView?: {postMessage: (msg: string) => void};
    __onHealthSync?: (result: {ok: boolean; saved?: number; error?: string}) => void;
  }
}

function Board({title, hint, samples}: {title: string; hint: string; samples: HealthReading[]}) {
  const layout = layoutHealth(samples);
  return (
    <section className={styles.card}>
      <div className={styles.heading}>{title}</div>
      <p className={styles.sub}>{hint}</p>
      {samples.length === 0 && <p className={styles.sub}>Nothing synced yet.</p>}
      {layout.highlights.length > 0 && (
        <div className={styles.grid}>
          {layout.highlights.map(item => (
            <div key={item.key} className={styles.tile}>
              <div className={styles.tileValue}>{item.value}</div>
              <div className={styles.tileLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      )}
      {layout.sections.map(section => (
        <div key={section.title} className={styles.section}>
          <div className={styles.sectionTitle}>{section.title}</div>
          {section.rows.map(item => (
            <div key={item.key} className={styles.row}>
              <span>
                <div className={styles.rowLabel}>{item.label}</div>
                {item.when && <div className={styles.rowWhen}>{item.when}</div>}
              </span>
              <span className={styles.rowValue}>{item.value}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function HealthPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch('/api/health/summary')
      .then(r => r.json())
      .then(setSummary)
      .catch(() => setNote('Could not load health data.'));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('whoop') === 'connected') setNote('Whoop connected.');
    if (q.get('whoop') === 'error') setNote(q.get('msg') ?? 'Whoop connection failed.');
    void load();
    window.__onHealthSync = result => {
      setBusy(false);
      setNote(result.ok ? `Saved ${result.saved ?? 0} readings.` : (result.error ?? 'Sync failed'));
      if (result.ok) void load();
    };
  }, []);

  const syncPhone = async () => {
    if (!window.ReactNativeWebView) {
      setNote('Apple Health and Health Connect only sync inside the mobile app, and not from Expo Go. Use a development build.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/health/token', {method: 'POST'});
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      setNote(data.error ?? 'Could not start sync');
      return;
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'sync-health', token: data.token}));
  };

  const samples = summary?.samples ?? [];
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.heading}>Health</div>
        <p className={styles.sub}>
          Sync reads every category this phone is allowed to share. On the Apple sheet, turn on all of them or the missing ones stay blank.
        </p>
        {note && <div className={styles.note}>{note}</div>}
        <p className={styles.sub}>{summary?.whoop ? `Whoop linked${summary.whoop.userId ? ` (${summary.whoop.userId})` : ''}.` : 'Whoop not linked.'}</p>
        <div className={styles.actions}>
          <a className={`${buttons.btn} ${buttons.btnPrimary}`} href="/api/whoop/connect">Connect Whoop</a>
          <button className={buttons.btn} type="button" disabled={busy} onClick={() => void syncPhone()}>
            {busy ? 'Syncing…' : 'Sync Apple Health / Google Health'}
          </button>
        </div>
      </section>
      {SOURCES.map(source => (
        <Board
          key={source.source}
          title={source.title}
          hint={source.hint}
          samples={samples.filter(sample => sample.source === source.source)}
        />
      ))}
      {summary?.whoop && (
        <Board
          title="Whoop"
          hint="Latest recovery from the Whoop account linked above."
          samples={samples.filter(sample => sample.source === 'whoop')}
        />
      )}
    </main>
  );
}
