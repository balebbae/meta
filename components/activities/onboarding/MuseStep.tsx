'use client';
import Link from 'next/link';
import {StepShell} from './StepShell';
import type {MuseSummary} from '@/lib/activities/summary';
import styles from '../activities.module.css';

export function MuseStep({summary, invite, name}: {summary: MuseSummary; invite: number | null; name: string}) {
  return (
    <StepShell step="muse" invite={invite} skippable={false} continueLabel="Go to Activities">
      <div className={styles.card} style={{borderTop: '4px solid var(--fb-blue)'}}>
        <div className={styles.row} style={{marginBottom: 8}}>
          <span className={styles.iconBox} aria-hidden style={{background: 'linear-gradient(135deg, var(--fb-blue), #7a3cff)', color: '#fff'}}>
            🧠
          </span>
          <div>
            <div className={styles.title}>Hi {name.split(' ')[0]}, I&apos;m your Muse.</div>
            <div className={styles.small}>{summary.headline}</div>
          </div>
        </div>
        <h2 className={styles.h2} style={{marginTop: 12}}>
          What I&apos;ll say about you
        </h2>
        {summary.shares.map(s => (
          <div key={s} className={styles.summaryLine}>
            <span aria-hidden>🗣️</span>
            <span>{s}</span>
          </div>
        ))}
        {summary.secrets.length > 0 && (
          <>
            <h2 className={styles.h2} style={{marginTop: 12}}>
              What stays between us
            </h2>
            {summary.secrets.map(s => (
              <div key={s} className={styles.summaryLine}>
                <span aria-hidden>🤫</span>
                <span>{s}</span>
              </div>
            ))}
          </>
        )}
        <div className={styles.summaryLine}>
          <span aria-hidden>🚫</span>
          <span>{summary.nobody}</span>
        </div>
        <p className={styles.small} style={{marginTop: 12}}>
          Every question anyone asks me is logged for you. Read it any time under <Link href="/activities/privacy">Activities → Privacy</Link>, or see everything I know on <Link href="/activities/muse">your Muse page</Link>.
        </p>
      </div>
    </StepShell>
  );
}
