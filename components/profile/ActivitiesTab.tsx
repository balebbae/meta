import Link from 'next/link';
import {RallyAvatar} from '@/components/rally/Avatar';
import {activitySummary} from '@/lib/rally/queries';
import styles from './profile.module.css';

/** Profile "Activities" tab (§17): avatar with gear, locker, quests finished. Public game facts only, no health data. */
export async function ActivitiesTab({userId, name, avatarUrl, isOwn}: {userId: number; name: string; avatarUrl: string; isOwn: boolean}) {
  const a = await activitySummary(userId);
  const first = name.split(' ')[0];
  return (
    <section className={styles.card} aria-label="Activities">
      <h2 className={styles.cardTitle}>Activities</h2>
      <div style={{display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'}}>
        <RallyAvatar src={avatarUrl} name={name} gear={a.gear.map(g => g.slug)} size={120} state={a.active.length ? 'idle' : 'idle'} />
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(80px, 1fr))', gap: 12, flex: 1}}>
          {[
            ['Quests finished', a.finished.length],
            ['Moves logged', a.moves],
            ['Gear', a.gear.length],
          ].map(([label, n]) => (
            <div key={String(label)} style={{background: 'var(--fb-bg)', borderRadius: 8, padding: 12, textAlign: 'center'}}>
              <div style={{fontSize: 24, fontWeight: 700}}>{n}</div>
              <div style={{fontSize: 13, color: 'var(--fb-text-secondary)'}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <h3 style={{fontSize: 17, margin: '20px 0 8px'}}>Locker</h3>
      {a.gear.length ? (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
          {a.gear.map(g => (
            <span key={g.slug} title={g.description ?? ''} style={{background: 'var(--fb-icon-bg)', borderRadius: 'var(--fb-radius-pill)', padding: '6px 12px', fontSize: 14, fontWeight: 600}}>
              {g.label}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{isOwn ? 'Finish a quest with your squad to earn gear.' : `${first} hasn't earned gear yet.`}</p>
      )}
      <h3 style={{fontSize: 17, margin: '20px 0 8px'}}>Quests</h3>
      {a.active.length + a.finished.length === 0 ? (
        <p className={styles.empty}>{isOwn ? 'Start one from any group chat: tap the Rally star.' : `${first} hasn't joined a quest yet.`}</p>
      ) : (
        <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8}}>
          {a.active.map(q => (
            <li key={q.id}>
              <Link href={`/activities/games/${q.id}`} style={{display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 8, background: 'var(--fb-bg)', color: 'inherit', textDecoration: 'none'}}>
                <strong>{q.title}</strong>
                <span style={{color: 'var(--fb-text-secondary)'}}>{q.bossHp ? `${q.bossHpLeft}/${q.bossHp} HP` : 'Active'}</span>
              </Link>
            </li>
          ))}
          {a.finished.map(q => (
            <li key={q.id}>
              <Link href={`/activities/games/${q.id}`} style={{display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 8, background: 'var(--fb-bg)', color: 'inherit', textDecoration: 'none'}}>
                <strong>{q.title}</strong>
                <span style={{color: 'var(--fb-green)'}}>{q.bossName ? `${q.bossName} defeated` : 'Completed'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
