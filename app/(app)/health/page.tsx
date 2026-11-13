'use client';

import {useEffect, useState} from 'react';
import buttons from '@/components/closeness/closeness.module.css';
import type {FitnessLevel} from '@/lib/activities/level';
import {layoutHealth, type HealthReading} from '@/lib/health-format';
import styles from './health.module.css';

type Sample = HealthReading & {source: string};
type Summary = {whoop: {userId: string | null; connectedAt: string} | null; samples: Sample[]; level?: FitnessLevel};

const TABS = [
  {id: 'apple_health', label: 'Apple Health'},
  {id: 'whoop', label: 'Whoop'},
  {id: 'health_connect', label: 'Google Health'},
];

declare global {
  interface Window {
    ReactNativeWebView?: {postMessage: (msg: string) => void};
    __onHealthSync?: (result: {ok: boolean; saved?: number; error?: string}) => void;
  }
}

const TIER_LABEL = {new: 'Just starting', building: 'Building', regular: 'Regular', strong: 'Strong'};
const EASY_WHY = {recovery: 'your Whoop recovery is low', spike: 'you did a lot more than usual this week', sleep: 'you have slept under 6 hours lately'};
const per = (n: number) => (n < 1 ? 'under 1' : `${Math.round(n)}`);

/** What the user's Muse plans from: decided by code over 4 weeks of synced + logged workouts. */
function LevelCard({level}: {level: FitnessLevel}) {
  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Your level</h2>
      <p className={styles.sub}>
        Worked out from your last {level.weeks === 1 ? 'week' : `${level.weeks} weeks`} of workouts. Your Muse uses it for goal plans, suggestions and fair Rally games. It gets this rounded, never your Whoop numbers.
      </p>
      {level.easyWeek && <div className={styles.note}>Your Muse is keeping this week easy because {EASY_WHY[level.easyWeek]}.</div>}
      <div className={styles.grid}>
        <div className={styles.tile}>
          <div className={styles.tileValue}>{TIER_LABEL[level.tier]}</div>
          <div className={styles.tileLabel}>{per(level.activeDaysPerWeek)} active days a week</div>
        </div>
        {level.stepsPerDay != null && (
          <div className={styles.tile}>
            <div className={styles.tileValue}>{Math.round(level.stepsPerDay / 100) / 10}k</div>
            <div className={styles.tileLabel}>Steps a day</div>
          </div>
        )}
        {level.sleepHours != null && (
          <div className={styles.tile}>
            <div className={styles.tileValue}>{level.sleepHours} h</div>
            <div className={styles.tileLabel}>Sleep a night</div>
          </div>
        )}
      </div>
      {level.activities.map(a => (
        <div key={a.kind} className={styles.row}>
          <span>
            <div className={styles.rowLabel}>{a.kind[0].toUpperCase() + a.kind.slice(1)}</div>
            <div className={styles.rowWhen}>
              {per(a.perWeek)} a week{a.kmPerWeek ? ` · ${a.kmPerWeek} km a week` : ''}{a.trend !== 'steady' ? ` · trending ${a.trend}` : ''}
            </div>
          </span>
          <span className={styles.rowValue}>{TIER_LABEL[a.tier]}</span>
        </div>
      ))}
    </section>
  );
}

function Board({samples}: {samples: HealthReading[]}) {
  const layout = layoutHealth(samples);
  if (samples.length === 0) return <div className={styles.empty}>Nothing synced yet.</div>;
  return (
    <>
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
          <div className={styles.sectionTitle}>
            {section.title}
            <span className={styles.count}>{section.rows.length}</span>
          </div>
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
    </>
  );
}

export default function HealthPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('apple_health');

  const load = () =>
    fetch('/api/health/summary')
      .then(r => r.json())
      .then(setSummary)
      .catch(() => setNote('Could not load health data.'));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('whoop') === 'connected') {
      setNote('Whoop connected.');
      setTab('whoop');
    }
    if (q.get('whoop') === 'error') setNote(q.get('msg') ?? 'Whoop connection failed.');
    void load();
    window.__onHealthSync = result => {
      setBusy(false);
      setNote(result.ok ? `Saved ${result.saved ?? 0} readings.` : (result.error ?? 'Sync failed'));
      if (result.ok) {
        setTab('apple_health');
        void load();
      }
    };
  }, []);

  const syncPhone = async () => {
    if (!window.ReactNativeWebView) {
      setNote('Open this page in the phone app to read Apple Health or Google Health.');
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

  const syncWhoop = async () => {
    setBusy(true);
    const res = await fetch('/api/whoop/sync', {method: 'POST'});
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setNote(res.ok ? `Saved ${data.saved ?? 0} Whoop readings.` : (data.error ?? 'Whoop sync failed'));
    if (res.ok) {
      setTab('whoop');
      void load();
    }
  };

  const samples = summary?.samples ?? [];
  const visible = samples.filter(sample => sample.source === tab);
  const linked = Boolean(summary?.whoop);
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.heading}>Health</h1>
        <p className={styles.sub}>
          {linked ? 'Whoop is linked. ' : ''}
          Apple Health and Google Health sync from the phone. Allow every category or those readings stay blank.
        </p>
        {note && <div className={styles.note}>{note}</div>}
        <div className={styles.actions}>
          <a className={`${buttons.btn} ${buttons.btnPrimary}`} href="/api/whoop/connect">{linked ? 'Reconnect Whoop' : 'Connect Whoop'}</a>
          {linked && (
            <button className={buttons.btn} type="button" disabled={busy} onClick={() => void syncWhoop()}>
              {busy ? 'Syncing…' : 'Sync Whoop'}
            </button>
          )}
          <button className={buttons.btn} type="button" disabled={busy} onClick={() => void syncPhone()}>
            {busy ? 'Syncing…' : 'Sync phone'}
          </button>
        </div>
      </section>
      {summary?.level && <LevelCard level={summary.level} />}
      <section className={styles.card}>
        <div className={styles.tabs}>
          {TABS.map(item => (
            <button key={item.id} type="button" className={tab === item.id ? styles.tabOn : styles.tab} onClick={() => setTab(item.id)}>
              {item.label}
              {samples.some(sample => sample.source === item.id) ? ` ${samples.filter(sample => sample.source === item.id).length}` : ''}
            </button>
          ))}
        </div>
        <Board samples={visible} />
      </section>
    </main>
  );
}
