'use client';
import Image from 'next/image';
import {useState} from 'react';
import type {FbEvent} from '@/lib/secondary-queries';
import {formatCount, formatEventDate} from '@/lib/secondary-data';
import {BookmarkOutlineIcon, MoreIcon, StarIcon, StarOutlineIcon} from './icons';
import {EventActivityBanner} from '@/components/activities/EventActivityBanner';
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

  const happening = new Date(event.startsAt).getTime() <= Date.now();
  const going = Math.max(1, Math.round(count / 25));
  return (
    <article className={styles.card}>
      <div className={styles.img}>
        <Image src={event.coverUrl} alt="" fill sizes="(max-width: 900px) 100vw, 300px" />
        <button type="button" className={styles.more} aria-label="More options">
          <MoreIcon size={16} />
        </button>
      </div>
      <div className={styles.body}>
        <div className={happening ? styles.dateLive : styles.date}>{happening ? 'Happening now' : formatEventDate(event.startsAt)}</div>
        <a href={`/events?id=${event.id}`} className={styles.title}>
          {event.title}
        </a>
        <div className={styles.loc}>{event.isOnline ? 'Online event' : event.location}</div>
        <div className={styles.count}>
          {formatCount(count)} interested · {formatCount(going)} going
        </div>
        <EventActivityBanner eventId={event.id} />
        <div className={styles.actions}>
          <button type="button" className={on ? styles.interestedOn : styles.interested} onClick={toggle} aria-pressed={on}>
            {on ? <StarIcon size={16} /> : <StarOutlineIcon size={16} />}
            Interested
          </button>
          <button type="button" className={styles.share} aria-label="Save">
            <BookmarkOutlineIcon size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
