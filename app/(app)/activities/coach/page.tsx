import Link from 'next/link';
import {redirect} from 'next/navigation';
import {CoachPanel} from '@/components/activities/CoachPanel';
import {getSessionUser} from '@/lib/auth';
import styles from '@/components/activities/activities.module.css';

export const dynamic = 'force-dynamic';

export default async function CoachPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  return (
    <main className={styles.page}>
      <Link href="/activities/muse" className={styles.btnText}>
        ← Your Muse
      </Link>
      <h1 className={styles.h1}>Coach</h1>
      <p className={styles.sub}>Your Muse compares this week with last week, shows what improved and where the gaps are, and plans how to bridge them. Only you see this.</p>
      <CoachPanel />
    </main>
  );
}
