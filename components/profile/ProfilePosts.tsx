'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {Post, User} from '@/lib/types';
import {PostCard} from '@/components/feed/PostCard';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import {Popover} from '@/components/ui/Popover';
import {FeedPhotoIcon, LiveVideoIcon, MobileNavIcon} from '@/components/icons';
import {FlagIcon, GearIcon, GridIcon, ListIcon, LiveIcon, PhotoIcon, SlidersIcon} from './icons';
import styles from './profile.module.css';

export function ProfilePosts({posts, viewer, owner, isOwn}: {posts: Post[]; viewer: User; owner: User; isOwn: boolean}) {
  const [filters, setFilters] = useState(false);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [manage, setManage] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const reset = () => { if (!media.matches) { setPhotosOnly(false); setFilters(false); setManage(false); } };
    media.addEventListener('change', reset);
    return () => media.removeEventListener('change', reset);
  }, []);
  const shown = photosOnly ? posts.filter(p => p.imageUrl) : posts;
  return (
    <>
      <section className={styles.mobilePostTools} aria-label="Mobile post tools">
        <div className={styles.mobilePostsHead}>
          <h2>All posts</h2>
          <span className={styles.mobileFilterAnchor}>
            <button onClick={() => setFilters(v => !v)} aria-expanded={filters}>Filters</button>
            <Popover open={filters} onClose={() => setFilters(false)} width={180}>
              <button onClick={() => { setPhotosOnly(false); setFilters(false); }}>All posts</button>
              <button onClick={() => { setPhotosOnly(true); setFilters(false); }}>Photo posts</button>
            </Popover>
          </span>
        </div>
        {isOwn && <>
          <div className={styles.profileComposer}>
            <Link href={`/profile/${viewer.id}`}><Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} /></Link>
            <Link href="/" className={styles.profileComposerText}>What&apos;s on your mind?</Link>
            <Link href="/" aria-label="Photo"><FeedPhotoIcon size={24} /></Link>
          </div>
          <div className={styles.mobileChips}>
            <Link href="/reels"><MobileNavIcon name="reels" size={20} />Reel</Link>
            <Link href="/video?tab=live"><LiveVideoIcon size={20} />Live</Link>
          </div>
          <button className={styles.mobileManage} onClick={() => { setPhotosOnly(false); setManage(true); }}><GearIcon size={16} />Manage posts</button>
        </>}
      </section>
      {isOwn && (
        <section className={`${styles.card} ${styles.desktopOnly}`} aria-label="Create post">
          <div className={styles.composerRow}>
            <Link href={`/profile/${viewer.id}`}>
              <Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} />
            </Link>
            <Link href="/" className={styles.composerInput}>What&apos;s on your mind?</Link>
          </div>
          <div className={styles.composerActions}>
            <button type="button" className={styles.composerAction}><LiveIcon size={24} /> Live video</button>
            <button type="button" className={styles.composerAction}><PhotoIcon size={24} /> Photo/video</button>
            <button type="button" className={styles.composerAction}><FlagIcon size={24} /> Life update</button>
          </div>
        </section>
      )}
      <section className={`${styles.card} ${styles.desktopOnly}`} aria-label="Posts filters">
        <div className={styles.filterBar}>
          <h2 className={styles.cardTitle}>Posts</h2>
          <div className={styles.filterBtns}>
            <button type="button" className="fb-btn-secondary"><SlidersIcon size={16} /> Filters</button>
            {isOwn && <button type="button" className="fb-btn-secondary"><GearIcon size={16} /> Manage posts</button>}
          </div>
        </div>
        <div className={styles.viewTabs}>
          <button type="button" className={`${styles.viewTab} ${styles.viewTabActive}`}><ListIcon size={16} /> List view</button>
          <button type="button" className={styles.viewTab}><GridIcon size={16} /> Grid view</button>
        </div>
      </section>
      {shown.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>{photosOnly ? 'No photo posts to show.' : isOwn ? 'You have not posted anything yet.' : `${owner.name} hasn't posted anything yet.`}</div>
      ) : (
        shown.map(p => <div key={p.id} id={`profile-post-${p.id}`} className={styles.profilePost}><PostCard post={p} viewer={viewer} mobileFeed /></div>)
      )}
      {posts.length > 0 && <p className={styles.postsEnd}>No more posts</p>}
      <Dialog open={manage} onClose={() => setManage(false)} title="Manage posts">
        {posts.length === 0 ? <p className={styles.empty}>You have not posted anything yet.</p> : <div className={styles.manageList}>
          {posts.map(p => <a key={p.id} href={`#profile-post-${p.id}`} onClick={() => setManage(false)}><span>{p.content || 'Photo post'}</span><span>View post ›</span></a>)}
        </div>}
      </Dialog>
    </>
  );
}
