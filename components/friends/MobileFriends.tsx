'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {SearchIcon} from '@/components/icons';
import {profileApi} from '@/components/profile/api';
import type {FriendSummary} from '@/lib/profile-queries';
import type {User} from '@/lib/types';
import styles from '@/components/mobile/mobile.module.css';

type Props = {viewer: User; view: string; requests: FriendSummary[]; suggestions: FriendSummary[]; friends: FriendSummary[]};
type Status = 'idle' | 'confirmed' | 'removed' | 'requested' | 'cancelled';

function mutual(u: FriendSummary) {
  return u.mutualCount > 0 ? `${u.mutualCount} mutual ${u.mutualCount === 1 ? 'friend' : 'friends'}` : 'New to Facebook';
}

/** /friends as laid out by the Facebook iOS app: title, pills, request rows, then everyone on the app. */
export function MobileFriends({viewer, view, requests, suggestions: initial, friends}: Props) {
  const router = useRouter();
  const tab = view === 'all' ? 'friends' : 'suggestions';
  const [suggestions, setSuggestions] = useState(initial);
  const [q, setQ] = useState('');
  const [state, setState] = useState<Record<number, Status>>({});

  useEffect(() => setSuggestions(initial), [initial]);
  useEffect(() => {
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
  }, [q]);

  async function act(id: number, next: Status, call: () => Promise<unknown>) {
    setState(s => ({...s, [id]: next}));
    try {
      await call();
      router.refresh();
    } catch {
      setState(s => ({...s, [id]: 'idle'}));
    }
  }

  const pendingIncoming = new Set(requests.map(r => r.id));
  const people = suggestions.filter(u => !pendingIncoming.has(u.id) || state[u.id]);

  return (
    <div className={`${styles.mobileBlock} ${styles.friendsPage}`}>
      <header className={`${styles.titleBar} ${styles.mobileOnly}`} style={{background: 'var(--fb-card)'}}>
        <h1>Friends</h1>
        <Link href="/friends?view=suggestions" className={styles.titleBtn} aria-label="Search">
          <SearchIcon size={22} />
        </Link>
      </header>
      <div className={styles.pills}>
        <Link href="/friends?view=suggestions" className={`${styles.pill} ${tab === 'suggestions' ? styles.pillActive : ''}`} style={{display: 'inline-flex', alignItems: 'center'}}>
          Suggestions
        </Link>
        <Link href="/friends?view=all" className={`${styles.pill} ${tab === 'friends' ? styles.pillActive : ''}`} style={{display: 'inline-flex', alignItems: 'center'}}>
          Your friends
        </Link>
      </div>

      {tab === 'friends' ? (
        <>
          <div className={styles.friendsHead}>
            <span>
              {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
            </span>
          </div>
          {friends.length === 0 && <p className={styles.empty}>No friends yet. Find people in Suggestions.</p>}
          {friends.map(u => (
            <div key={u.id} className={styles.personRow}>
              <Link href={`/profile/${u.id}`}>
                <Avatar src={u.avatarUrl} alt={u.name} size={60} online={u.isOnline} />
              </Link>
              <div className={styles.personBody}>
                <Link href={`/profile/${u.id}`} className={styles.personName}>
                  {u.name}
                </Link>
                <div className={styles.personSub}>{u.mutualCount > 0 ? mutual(u) : 'Friends'}</div>
              </div>
              <Link href={`/messages?to=${u.id}`} className={`${styles.btnSecondary}`} style={{height: 36, padding: '0 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 15}}>
                Message
              </Link>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className={styles.friendsHead}>
            <span>
              Friend requests
              <small>{requests.length}</small>
            </span>
          </div>
          {requests.length === 0 && <p className={styles.empty}>No pending requests.</p>}
          {requests.map(u => {
            const st = state[u.id] ?? 'idle';
            return (
              <div key={u.id} className={styles.personRow}>
                <Link href={`/profile/${u.id}`}>
                  <Avatar src={u.avatarUrl} alt={u.name} size={60} />
                </Link>
                <div className={styles.personBody}>
                  <Link href={`/profile/${u.id}`} className={styles.personName}>
                    {u.name}
                  </Link>
                  <div className={styles.personSub}>{mutual(u)}</div>
                  {st === 'idle' ? (
                    <div className={styles.personBtns}>
                      <button className={styles.btnPrimary} onClick={() => act(u.id, 'confirmed', () => profileApi.accept(u.id))}>
                        Confirm
                      </button>
                      <button className={styles.btnSecondary} onClick={() => act(u.id, 'removed', () => profileApi.remove(u.id))}>
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className={styles.personStatus}>{st === 'confirmed' ? `You are now friends with ${u.name.split(' ')[0]}` : 'Request removed'}</div>
                  )}
                </div>
              </div>
            );
          })}
          <div className={styles.friendsDivider} />
          <div className={styles.friendsHead}>
            <span>People you may know</span>
          </div>
          <label className={styles.searchBox}>
            <SearchIcon size={18} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people on Facebook" aria-label="Search people" />
          </label>
          {people.length === 0 && <p className={styles.empty}>{q ? `No people found for "${q}".` : 'Everyone on Facebook is already your friend.'}</p>}
          {people.map(u => {
            const st = state[u.id] ?? 'idle';
            return (
              <div key={u.id} className={styles.personRow}>
                <Link href={`/profile/${u.id}`}>
                  <Avatar src={u.avatarUrl} alt={u.name} size={60} />
                </Link>
                <div className={styles.personBody}>
                  <Link href={`/profile/${u.id}`} className={styles.personName}>
                    {u.name}
                  </Link>
                  <div className={styles.personSub}>{mutual(u)}</div>
                  {st !== 'idle' ? (
                    <div className={styles.personStatus}>
                      {st === 'requested' && 'Request sent'}
                      {st === 'cancelled' && 'Request cancelled'}
                      {st === 'confirmed' && `You are now friends with ${u.name.split(' ')[0]}`}
                      {st === 'removed' && 'Removed'}
                    </div>
                  ) : u.relation === 'incoming' ? (
                    <div className={styles.personBtns}>
                      <button className={styles.btnPrimary} onClick={() => act(u.id, 'confirmed', () => profileApi.accept(u.id))}>
                        Respond
                      </button>
                      <button className={styles.btnSecondary} onClick={() => act(u.id, 'removed', () => profileApi.remove(u.id))}>
                        Delete
                      </button>
                    </div>
                  ) : u.relation === 'outgoing' ? (
                    <div className={styles.personBtns}>
                      <button className={styles.btnSecondary} onClick={() => act(u.id, 'cancelled', () => profileApi.remove(u.id))}>
                        Cancel request
                      </button>
                    </div>
                  ) : (
                    <div className={styles.personBtns}>
                      <button className={styles.btnPrimary} onClick={() => act(u.id, 'requested', () => profileApi.sendRequest(u.id))}>
                        Add friend
                      </button>
                      <button className={styles.btnSecondary} onClick={() => act(u.id, 'removed', () => Promise.resolve())}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
      <span hidden>{viewer.id}</span>
    </div>
  );
}
