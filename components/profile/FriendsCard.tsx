import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import type {FriendSummary} from '@/lib/profile-queries';
import styles from './profile.module.css';

export function FriendsCard({friends, count, userId}: {friends: FriendSummary[]; count: number; userId: number}) {
  return (
    <section className={styles.card} aria-labelledby="friends-title">
      <div className={styles.cardHead}>
        <div>
          <h2 id="friends-title" className={styles.cardTitle}>Friends</h2>
          <span className={styles.cardSub}>{count.toLocaleString()} {count === 1 ? 'friend' : 'friends'}</span>
        </div>
        <Link href={`/profile/${userId}?tab=friends`} className={styles.link}><span className={styles.desktopOnly}>See all friends</span><span className={styles.mobileLabel}>See all</span></Link>
      </div>
      {friends.length === 0 ? (
        <p className={styles.empty}>No friends to show</p>
      ) : (
        <div className={styles.friendGrid}>
          {friends.slice(0, 9).map(f => (
            <Link key={f.id} href={`/profile/${f.id}`} className={styles.friendTile}>
              <div className={styles.friendTileImg}>
                <Image src={f.avatarUrl} alt="" fill sizes="140px" />
              </div>
              <span className={styles.friendTileName}>{f.name}</span>
              <span className={`${styles.friendMutual} ${styles.mobileLabel}`}>{f.mutualCount} mutual {f.mutualCount === 1 ? 'friend' : 'friends'}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
