'use client';
import Link from 'next/link';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import styles from './layout.module.css';

export type FriendRequestItem = {id: number; name: string; avatarUrl: string; createdAt?: string | null; mutualCount?: number};

export function FriendRequests({initial}: {initial: FriendRequestItem[]}) {
  const [items, setItems] = useState(initial);
  if (items.length === 0) return null;
  const act = async (id: number, accept: boolean) => {
    setItems(list => list.filter(r => r.id !== id));
    try {
      if (accept) await fetch('/api/friends/accept', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId: id})});
      else await fetch(`/api/friends/${id}`, {method: 'DELETE'});
    } catch {}
  };
  return (
    <>
      <div className={styles.rrDivider} />
      <div className={styles.rrHeading}>
        <span>Friend requests</span>
        <Link href="/friends" className={styles.rrSeeAll}>
          See all
        </Link>
      </div>
      {items.slice(0, 3).map(r => (
        <div key={r.id} className={styles.frRow}>
          <Link href={`/profile/${r.id}`}>
            <Avatar src={r.avatarUrl} alt="" size={60} />
          </Link>
          <div className={styles.frBody}>
            <div className={styles.frTop}>
              <Link href={`/profile/${r.id}`} className={styles.frName}>
                {r.name}
              </Link>
              <span className={styles.frTime}>{r.mutualCount ? `${r.mutualCount} mutual` : '3h'}</span>
            </div>
            <div className={styles.frBtns}>
              <button className={styles.frConfirm} onClick={() => act(r.id, true)}>
                Confirm
              </button>
              <button className={styles.frDelete} onClick={() => act(r.id, false)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
