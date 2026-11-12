'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {FriendshipState} from '@/lib/profile-queries';
import {profileApi} from './api';
import {CheckIcon, ChevronDownIcon, PersonCheckIcon, PersonPlusIcon} from './icons';
import styles from './profile.module.css';

/** Add friend / Cancel request / Respond / Friends ✓ button with optimistic state changes. */
export function FriendButton({userId, initial}: {userId: number; initial: FriendshipState}) {
  const [state, setState] = useState<FriendshipState>(initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function run(optimistic: FriendshipState, call: () => Promise<{friendship: FriendshipState}>) {
    const prev = state;
    setState(optimistic);
    setOpen(false);
    try {
      const {friendship} = await call();
      setState(friendship);
      router.refresh();
    } catch {
      setState(prev);
    }
  }

  if (state === 'self') return null;

  if (state === 'none') {
    return (
      <button type="button" className="fb-btn-primary" onClick={() => run('outgoing', () => profileApi.sendRequest(userId))}>
        <PersonPlusIcon size={16} /> Add friend
      </button>
    );
  }
  if (state === 'outgoing') {
    return (
      <button type="button" className="fb-btn-secondary" onClick={() => run('none', () => profileApi.remove(userId))}>
        <PersonCheckIcon size={16} /> Cancel request
      </button>
    );
  }
  if (state === 'incoming') {
    return (
      <div className={styles.menuWrap}>
        <button type="button" className="fb-btn-primary" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <PersonCheckIcon size={16} /> Respond <ChevronDownIcon size={16} />
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <button type="button" className={styles.menuItem} role="menuitem" onClick={() => run('friends', () => profileApi.accept(userId))}>
              Confirm
            </button>
            <button type="button" className={styles.menuItem} role="menuitem" onClick={() => run('none', () => profileApi.remove(userId))}>
              Delete request
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={styles.menuWrap}>
      <button type="button" className="fb-btn-secondary" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <CheckIcon size={16} /> Friends <ChevronDownIcon size={16} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button type="button" className={styles.menuItem} role="menuitem" onClick={() => run('none', () => profileApi.remove(userId))}>
            Unfriend
          </button>
        </div>
      )}
    </div>
  );
}
