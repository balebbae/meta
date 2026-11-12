'use client';

import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {FriendSummary} from '@/lib/profile-queries';
import {profileApi} from './api';
import {CheckIcon, ChevronDownIcon, EllipsisIcon, SearchIcon} from './icons';
import styles from './profile.module.css';

export function FriendsTab({friends, isOwn, ownerName}: {friends: FriendSummary[]; isOwn: boolean; ownerName: string}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState(friends);
  const [openId, setOpenId] = useState<number | null>(null);
  const router = useRouter();
  const shown = list.filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase()));

  async function unfriend(id: number) {
    const prev = list;
    setList(l => l.filter(f => f.id !== id));
    setOpenId(null);
    try {
      await profileApi.remove(id);
      router.refresh();
    } catch {
      setList(prev);
    }
  }

  return (
    <section className={styles.card} aria-label="Friends">
      <div className={styles.friendsTabHead}>
        <h2 className={styles.cardTitle}>Friends</h2>
        <div className={styles.friendsTabTitleRow}>
          <label className={styles.searchBox}>
            <SearchIcon size={16} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search friends" />
          </label>
          {isOwn && <Link href="/friends" className={styles.link}>Friend requests</Link>}
          {isOwn && <Link href="/friends" className={styles.link}>Find friends</Link>}
          <button type="button" className={`fb-btn-secondary ${styles.iconOnly}`} aria-label="More"><EllipsisIcon size={20} /></button>
        </div>
      </div>
      <div className={styles.friendsSubTabs}>
        {['All friends', 'Recently added', 'Birthdays', 'College', 'Current city', 'Hometown', 'Following'].map((t, i) => (
          <button key={t} type="button" className={`${styles.friendsSubTab} ${i === 0 ? styles.friendsSubTabActive : ''}`}>{t}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className={styles.empty}>{q ? 'No friends match your search' : `${ownerName} has no friends to show`}</p>
      ) : (
        <div className={styles.friendRows}>
          {shown.map(f => (
            <div key={f.id} className={styles.friendRow}>
              <Link href={`/profile/${f.id}`} className={styles.friendRowImg}>
                <Image src={f.avatarUrl} alt="" fill sizes="80px" />
              </Link>
              <div className={styles.friendRowText}>
                <Link href={`/profile/${f.id}`} className={styles.friendRowName}>{f.name}</Link>
                {f.mutualCount > 0 && <span className={styles.friendRowMutual}>{f.mutualCount} mutual {f.mutualCount === 1 ? 'friend' : 'friends'}</span>}
              </div>
              <div className={styles.menuWrap}>
                {isOwn ? (
                  <button type="button" className="fb-btn-secondary" onClick={() => setOpenId(openId === f.id ? null : f.id)} aria-expanded={openId === f.id}>
                    <CheckIcon size={16} /> Friends <ChevronDownIcon size={16} />
                  </button>
                ) : (
                  <button type="button" className={`fb-btn-secondary ${styles.iconOnly}`} aria-label="More"><EllipsisIcon size={20} /></button>
                )}
                {openId === f.id && (
                  <div className={styles.menu} role="menu">
                    <Link href={`/profile/${f.id}`} className={styles.menuItem} role="menuitem">View profile</Link>
                    <button type="button" className={styles.menuItem} role="menuitem" onClick={() => unfriend(f.id)}>Unfriend</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
