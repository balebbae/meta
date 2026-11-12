import {Leaderboard} from '@/components/closeness/Leaderboard';
import {QuestsPanel} from '@/components/closeness/QuestsPanel';
import styles from '@/components/closeness/closeness.module.css';

export default function ClosenessPage() {
  return (
    <main className={styles.page}>
      <h1 style={{fontSize: 24, fontWeight: 700, marginBottom: 12}}>Closeness</h1>
      <p style={{color: 'var(--fb-secondary-text, #65676b)', marginBottom: 16, fontSize: 15}}>
        Muse-powered XP, quests, and a weekly leaderboard for real contact — not vanity likes.
      </p>
      <QuestsPanel />
      <Leaderboard />
    </main>
  );
}
