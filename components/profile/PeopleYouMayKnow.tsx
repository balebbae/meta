'use client';

import {useRef, useState} from 'react';
import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import type {FriendSummary} from '@/lib/profile-queries';
import {profileApi} from './api';
import {ChevronRightIcon, CloseIcon, PersonPlusIcon} from './icons';
import styles from './profile.module.css';

export function PeopleYouMayKnow({suggestions}: {suggestions: FriendSummary[]}) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [sent, setSent] = useState<Set<number>>(new Set());
  const rowRef = useRef<HTMLDivElement>(null);
  const shown = suggestions.filter(s => !hidden.has(s.id));
  if (shown.length === 0) return null;

  async function add(id: number) {
    setSent(s => new Set(s).add(id));
    try {
      await profileApi.sendRequest(id);
    } catch {
      setSent(s => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  return (
    <section className={styles.pymk} aria-label="People you may know">
      <div className={styles.pymkHead}>
        <h2>People You May Know</h2>
        <Link href="/friends?view=suggestions" className={styles.link}>See all</Link>
      </div>
      <div className={styles.pymkRow} ref={rowRef}>
        {shown.map(s => (
          <div key={s.id} className={styles.pymkCard}>
            <Link href={`/profile/${s.id}`} className={styles.pymkImg}>
              <Image src={s.avatarUrl} alt={s.name} fill sizes="176px" />
              <button type="button" className={styles.pymkDismiss} aria-label={`Remove ${s.name}`} onClick={e => {e.preventDefault(); setHidden(h => new Set(h).add(s.id));}}>
                <CloseIcon size={16} />
              </button>
            </Link>
            <div className={styles.pymkBody}>
              <Link href={`/profile/${s.id}`} className={styles.pymkName}>{s.name}</Link>
              <span className={styles.pymkMutual}>{s.mutualCount > 0 ? `${s.mutualCount} mutual ${s.mutualCount === 1 ? 'friend' : 'friends'}` : ''}</span>
              <button type="button" className={styles.pymkBtn} disabled={sent.has(s.id)} onClick={() => add(s.id)}>
                {sent.has(s.id) ? 'Request sent' : <><PersonPlusIcon size={16} /> Add friend</>}
              </button>
            </div>
          </div>
        ))}
      </div>
      {shown.length > 6 && (
        <button type="button" className={styles.pymkNext} aria-label="Next" onClick={() => rowRef.current?.scrollBy({left: 560, behavior: 'smooth'})}>
          <ChevronRightIcon size={24} />
        </button>
      )}
    </section>
  );
}
