'use client';

import {useState} from 'react';
import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {FriendSummary} from '@/lib/profile-queries';
import {profileApi} from '@/components/profile/api';
import styles from './friends.module.css';

export function AllFriendsCards({friends}: {friends: FriendSummary[]}) {
  const [list, setList] = useState(friends);
  const router = useRouter();

  async function unfriend(id: number) {
    const prev = list;
    setList(l => l.filter(f => f.id !== id));
    try {
      await profileApi.remove(id);
      router.refresh();
    } catch {
      setList(prev);
    }
  }

  if (list.length === 0) return <p className={styles.empty}>No friends to show.</p>;
  return (
    <div className={styles.grid}>
      {list.map(u => (
        <div key={u.id} className={styles.card}>
          <Link href={`/profile/${u.id}`} className={styles.cardImg}>
            <Image src={u.avatarUrl} alt={u.name} fill sizes="(max-width: 900px) 50vw, 240px" />
          </Link>
          <div className={styles.cardBody}>
            <Link href={`/profile/${u.id}`} className={styles.cardName}>{u.name}</Link>
            <span className={styles.cardMutual}>{u.mutualCount > 0 ? `${u.mutualCount} mutual ${u.mutualCount === 1 ? 'friend' : 'friends'}` : '\u00a0'}</span>
            <Link href={`/profile/${u.id}`} className={`fb-btn-secondary ${styles.cardBtn}`}>View profile</Link>
            <button type="button" className={`fb-btn-secondary ${styles.cardBtn}`} onClick={() => unfriend(u.id)}>Unfriend</button>
          </div>
        </div>
      ))}
    </div>
  );
}
