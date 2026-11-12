import Link from 'next/link';
import type {Post, User} from '@/lib/types';
import {PostCard} from '@/components/feed/PostCard';
import {Avatar} from '@/components/ui/Avatar';
import {FlagIcon, GearIcon, LiveIcon, PhotoIcon, SlidersIcon} from './icons';
import styles from './profile.module.css';

export function ProfilePosts({posts, viewer, owner, isOwn}: {posts: Post[]; viewer: User; owner: User; isOwn: boolean}) {
  return (
    <>
      {isOwn && (
        <section className={styles.card} aria-label="Create post">
          <div className={styles.composerRow}>
            <Link href={`/profile/${viewer.id}`}>
              <Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} />
            </Link>
            <Link href="/" className={styles.composerInput}>What&apos;s on your mind?</Link>
          </div>
          <div className={styles.composerActions}>
            <button type="button" className={styles.composerAction}><LiveIcon size={24} /> Live video</button>
            <button type="button" className={styles.composerAction}><PhotoIcon size={24} /> Photo/video</button>
            <button type="button" className={styles.composerAction}><FlagIcon size={24} /> Life event</button>
          </div>
        </section>
      )}
      <section className={`${styles.card} ${styles.filterBar}`} aria-label="Posts filters">
        <h2 className={styles.cardTitle}>Posts</h2>
        <div className={styles.filterBtns}>
          <button type="button" className="fb-btn-secondary"><SlidersIcon size={16} /> Filters</button>
          {isOwn && <button type="button" className="fb-btn-secondary"><GearIcon size={16} /> Manage posts</button>}
        </div>
      </section>
      {posts.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>{isOwn ? 'You have not posted anything yet.' : `${owner.name} hasn't posted anything yet.`}</div>
      ) : (
        posts.map(p => <PostCard key={p.id} post={p} viewer={viewer} />)
      )}
      {posts.length > 0 && <p className={styles.postsEnd}>No more posts</p>}
    </>
  );
}
