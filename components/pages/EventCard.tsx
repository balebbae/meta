'use client';
import Image from 'next/image';
import {useState} from 'react';
import type {FbEvent} from '@/lib/secondary-queries';
import {formatCount, formatEventDate} from '@/lib/secondary-data';
import {ShareIcon, StarIcon, StarOutlineIcon} from './icons';
import styles from './events.module.css';

export function EventCard({event}: {event: FbEvent}) {
  const [status, setStatus] = useState(event.viewerStatus);
  const [count, setCount] = useState(event.interestedCount);
  const on = status === 'interested' || status === 'going';

  async function toggle() {
    const next = !on;
    setStatus(next ? 'interested' : null);
    setCount(c => c + (next ? 1 : -1));
    const res = await fetch(`/api/events/${event.id}/interested`, {method: next ? 'POST' : 'DELETE'});
    if (!res.ok) {
      setStatus(next ? null : 'interested');
      setCount(c => c + (next ? -1 : 1));
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.img}>
        <Image src={event.coverUrl} alt="" fill sizes="(max-width: 900px) 100vw, 300px" />
      </div>
      <div className={styles.body}>
        <div className={styles.date}>{formatEventDate(event.startsAt)}</div>
        <a href={`/events?id=${event.id}`} className={styles.title}>
          {event.title}
        </a>
        <div className={styles.loc}>{event.isOnline ? 'Online event' : event.location}</div>
        <div className={styles.count}>{formatCount(count)} people interested</div>
        <div className={styles.actions}>
          <button type="button" className={on ? styles.interestedOn : styles.interested} onClick={toggle} aria-pressed={on}>
            {on ? <StarIcon size={16} /> : <StarOutlineIcon size={16} />}
            Interested
          </button>
          <button type="button" className={styles.share} aria-label="Share">
            <ShareIcon size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
