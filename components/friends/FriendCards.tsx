'use client';

import {useEffect, useState} from 'react';
import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {FriendSummary} from '@/lib/profile-queries';
import {profileApi} from '@/components/profile/api';
import {SearchIcon} from '@/components/icons';
import styles from './friends.module.css';

type Status = 'idle' | 'confirmed' | 'removed' | 'requested' | 'cancelled';

function Card({user, status, primary, secondary, onPrimary, onSecondary}: {user: FriendSummary; status: Status; primary: string; secondary: string; onPrimary: () => void; onSecondary: () => void}) {
  return (
    <div className={styles.card}>
      <Link href={`/profile/${user.id}`} className={styles.cardImg}>
        {user.avatarUrl.startsWith('data:') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.name} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          <Image src={user.avatarUrl} alt={user.name} fill sizes="(max-width: 900px) 50vw, 240px" />
        )}
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
            {status === 'cancelled' && 'Request cancelled'}
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

export function SuggestionCards({suggestions: initial, searchable = false}: {suggestions: FriendSummary[]; searchable?: boolean}) {
  const [suggestions, setSuggestions] = useState(initial);
  const [q, setQ] = useState('');
  const [state, setState] = useState<Record<number, Status>>({});
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const router = useRouter();
  const shown = suggestions.filter(u => !hidden.has(u.id));

  useEffect(() => setSuggestions(initial), [initial]);
  useEffect(() => {
    if (!searchable) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/friends/suggestions?q=${encodeURIComponent(q)}`, {signal: ctl.signal, cache: 'no-store'})
        .then(r => (r.ok ? r.json() : null))
        .then((d: {suggestions: FriendSummary[]} | null) => d && setSuggestions(d.suggestions))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, searchable]);

  async function act(id: number, next: Status, call: () => Promise<unknown>) {
    setState(s => ({...s, [id]: next}));
    try {
      await call();
      router.refresh();
    } catch {
      setState(s => ({...s, [id]: 'idle'}));
    }
  }

  return (
    <>
      {searchable && (
        <label className={styles.search}>
          <SearchIcon size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" />
        </label>
      )}
      {shown.length === 0 ? (
        <p className={styles.empty}>{q ? `No people found for "${q}".` : 'No more suggestions right now.'}</p>
      ) : (
        <div className={styles.grid}>
          {shown.map(u =>
            u.relation === 'incoming' ? (
              <Card
                key={u.id}
                user={u}
                status={state[u.id] ?? 'idle'}
                primary="Confirm"
                secondary="Delete"
                onPrimary={() => act(u.id, 'confirmed', () => profileApi.accept(u.id))}
                onSecondary={() => act(u.id, 'removed', () => profileApi.remove(u.id))}
              />
            ) : u.relation === 'outgoing' ? (
              <Card
                key={u.id}
                user={u}
                status={state[u.id] ?? 'idle'}
                primary="Cancel request"
                secondary="Remove"
                onPrimary={() => act(u.id, 'cancelled', () => profileApi.remove(u.id))}
                onSecondary={() => setHidden(h => new Set(h).add(u.id))}
              />
            ) : (
              <Card
                key={u.id}
                user={u}
                status={state[u.id] ?? 'idle'}
                primary="Add friend"
                secondary="Remove"
                onPrimary={() => act(u.id, 'requested', () => profileApi.sendRequest(u.id))}
                onSecondary={() => setHidden(h => new Set(h).add(u.id))}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}
