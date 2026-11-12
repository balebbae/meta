'use client';

import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {FriendSummary} from '@/lib/profile-queries';
import {profileApi} from '@/components/profile/api';
import styles from './friends.module.css';

type Status = 'idle' | 'confirmed' | 'removed' | 'requested';

function Card({user, status, primary, secondary, onPrimary, onSecondary}: {user: FriendSummary; status: Status; primary: string; secondary: string; onPrimary: () => void; onSecondary: () => void}) {
  return (
    <div className={styles.card}>
      <Link href={`/profile/${user.id}`} className={styles.cardImg}>
        <Image src={user.avatarUrl} alt={user.name} fill sizes="(max-width: 900px) 50vw, 240px" />
      </Link>
      <div className={styles.cardBody}>
        <Link href={`/profile/${user.id}`} className={styles.cardName}>{user.name}</Link>
        <span className={styles.cardMutual}>
          {user.mutualCount > 0 ? `${user.mutualCount} mutual ${user.mutualCount === 1 ? 'friend' : 'friends'}` : '\u00a0'}
        </span>
        {status === 'idle' ? (
          <>
            <button type="button" className={`fb-btn-primary ${styles.cardBtn}`} onClick={onPrimary}>{primary}</button>
            <button type="button" className={`fb-btn-secondary ${styles.cardBtn}`} onClick={onSecondary}>{secondary}</button>
          </>
        ) : (
          <span className={styles.cardStatus}>
            {status === 'confirmed' && `You are now friends with ${user.name.split(' ')[0]}`}
            {status === 'removed' && 'Request removed'}
            {status === 'requested' && 'Request sent'}
          </span>
        )}
      </div>
    </div>
  );
}

export function RequestCards({requests}: {requests: FriendSummary[]}) {
  const [state, setState] = useState<Record<number, Status>>({});
  const router = useRouter();

  async function act(id: number, next: Status, call: () => Promise<unknown>) {
    setState(s => ({...s, [id]: next}));
    try {
      await call();
      router.refresh();
    } catch {
      setState(s => ({...s, [id]: 'idle'}));
    }
  }

  if (requests.length === 0) return <p className={styles.empty}>When you have friend requests or suggestions, you&apos;ll see them here.</p>;
  return (
    <div className={styles.grid}>
      {requests.map(u => (
        <Card
          key={u.id}
          user={u}
          status={state[u.id] ?? 'idle'}
          primary="Confirm"
          secondary="Delete"
          onPrimary={() => act(u.id, 'confirmed', () => profileApi.accept(u.id))}
          onSecondary={() => act(u.id, 'removed', () => profileApi.remove(u.id))}
        />
      ))}
    </div>
  );
}

export function SuggestionCards({suggestions}: {suggestions: FriendSummary[]}) {
  const [state, setState] = useState<Record<number, Status>>({});
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const router = useRouter();
  const shown = suggestions.filter(u => !hidden.has(u.id));

  async function add(id: number) {
    setState(s => ({...s, [id]: 'requested'}));
    try {
      await profileApi.sendRequest(id);
      router.refresh();
    } catch {
      setState(s => ({...s, [id]: 'idle'}));
    }
  }

  if (shown.length === 0) return <p className={styles.empty}>No more suggestions right now.</p>;
  return (
    <div className={styles.grid}>
      {shown.map(u => (
        <Card
          key={u.id}
          user={u}
          status={state[u.id] ?? 'idle'}
          primary="Add friend"
          secondary="Remove"
          onPrimary={() => add(u.id)}
          onSecondary={() => setHidden(h => new Set(h).add(u.id))}
        />
      ))}
    </div>
  );
}
