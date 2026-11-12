'use client';
import {useState} from 'react';
import {AnswerPreview} from './AnswerPreview';
import {PrivacyMatrix} from './PrivacyMatrix';
import type {PolicyMatrix} from '@/lib/activities/policies';
import styles from './activities.module.css';

/** Matrix + live preview wired together so a policy change immediately re-asks the Muse (§14). */
export function PrivacyPanel({initial, showPreview = true}: {initial: PolicyMatrix; showPreview?: boolean}) {
  const [tick, setTick] = useState(0);
  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.h2}>What your Muse may say, to whom</h2>
        <p className={styles.sub}>Tap a category to set a level per audience. Exact, rounded, yes/no, Muse-only (it uses the data for your plan but never states it), or nothing.</p>
        <PrivacyMatrix initial={initial} onChange={() => setTick(t => t + 1)} />
      </div>
      {showPreview && (
        <div className={styles.card}>
          <h2 className={styles.h2}>Try it</h2>
          <p className={styles.sub}>This is the exact call games, Discover and mentors make. Flip Heart rate above and watch the answer change.</p>
          <AnswerPreview refreshKey={tick} />
        </div>
      )}
    </>
  );
}
