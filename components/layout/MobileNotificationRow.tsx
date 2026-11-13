'use client';

import Link from 'next/link';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Popover} from '@/components/ui/Popover';
import {BellIcon, CalendarIcon, FeedActionIcon, FeedPersonPlusIcon, MessengerIcon, MoreHorizontalIcon, UsersIcon} from '@/components/icons';
import {formatCompactTime} from '@/lib/format';
import type {Notification} from '@/lib/queries';
import styles from './notifications-mobile.module.css';

export function MobileNotificationRow({item: n, href, markRead, respond, busy}: {
  item: Notification; href: string; markRead: () => void; respond: (accept: boolean) => void; busy: boolean;
}) {
  const [more, setMore] = useState(false);
  const name = n.actor?.name;
  const start = name ? n.message.indexOf(name) : -1;
  const type = n.type === 'message' ? 'message' : n.type.startsWith('group') ? 'group' : n.type.startsWith('event') ? 'event' : n.type;
  return <div className={`${styles.row} ${!n.isRead ? styles.unread : ''}`}>
    <Link href={href} className={styles.hitArea} aria-label={n.message} onClick={markRead} />
    <span className={styles.avatar}>
      <Avatar src={n.actor?.avatarUrl ?? '/favicon.svg'} alt="" size={64} />
      <span className={`${styles.badge} ${type === 'event' ? styles.event : type === 'comment' ? styles.comment : ''}`}>
        {type === 'message' ? <MessengerIcon size={18} /> : type === 'event' ? <CalendarIcon size={18} /> : type === 'friend_request' || type === 'friend_accept' ? <FeedPersonPlusIcon size={18} /> : type === 'group' ? <UsersIcon size={18} /> : type === 'reaction' || type === 'comment' ? <FeedActionIcon name={type === 'reaction' ? 'like' : 'comment'} size={18} /> : <BellIcon size={18} />}
      </span>
    </span>
    <div className={styles.body}>
      <div className={styles.message}>
        {start >= 0 ? <>{n.message.slice(0, start)}<strong>{name}</strong>{n.message.slice(start + name!.length)}</> : n.message}
        {' '}<span className={styles.time}>{formatCompactTime(n.createdAt)}</span>
      </div>
      {n.type === 'friend_request' && n.actor && <div className={styles.actions}>
        <button disabled={busy} onClick={() => respond(true)}>Confirm</button>
        <button disabled={busy} onClick={() => respond(false)}>Delete</button>
      </div>}
    </div>
    <span className={styles.more}>
      <button aria-label={`More options for ${n.actor?.name ?? 'notification'}`} aria-expanded={more} onClick={() => setMore(v => !v)}><MoreHorizontalIcon size={22} /></button>
      <Popover open={more} onClose={() => setMore(false)} width={180}>
        <button className={styles.option} onClick={() => { markRead(); setMore(false); }}>Mark as read</button>
      </Popover>
    </span>
  </div>;
}
