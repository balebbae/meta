'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {LogWorkoutSheet, type LogTab} from './LogWorkoutSheet';
import styles from './activities.module.css';

/** /activities/log: opens the sheet immediately (nav target for "Log a workout"). */
export function LogWorkoutPage({initialTab}: {initialTab: LogTab}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>Log a workout</h1>
      <p className={styles.sub}>Manual, photo proof or voice. Everything goes to your private vault first.</p>
      <div className={styles.row}>
        <button className={styles.btnPrimary} onClick={() => setOpen(true)}>
          Open the log sheet
        </button>
        <Link href="/activities/muse" className={styles.btn}>
          See my vault
        </Link>
      </div>
      <LogWorkoutSheet open={open} initialTab={initialTab} onClose={() => setOpen(false)} onLogged={() => router.refresh()} />
    </main>
  );
}
