'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {BellIcon, CommentIcon, LikeFilledIcon, UsersIcon} from '@/components/icons';
import {formatCompactTime} from '@/lib/format';
import type {Notification} from '@/lib/queries';
import layout from '@/components/layout/layout.module.css';
import styles from './notifications.module.css';

/** Full-page notifications list (mobile tab bar bell, /notifications); same rows and actions as the header popover. */
export function NotificationsPage({initial}: {initial: Notification[]}) {
  const [items, setItems] = useState<Notification[]>(initial);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetch('/api/notifications', {cache: 'no-store'})
      .then(r => (r.ok ? r.json() : null))
      .then((d: {notifications: Notification[]} | null) => d && setItems(d.notifications))
      .catch(() => {});
  }, []);

  const markRead = async (ids: number[] | 'all') => {
    setItems(list => list.map(n => (ids === 'all' || ids.includes(n.id) ? {...n, isRead: true} : n)));
    await fetch('/api/notifications', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(ids === 'all' ? {all: true} : {ids})}).catch(() => {});
  };
  const respond = async (n: Notification, accept: boolean) => {
    if (!n.actor) return;
    setItems(list => list.filter(x => x.id !== n.id));
    void markRead([n.id]);
    try {
      if (accept) await fetch('/api/friends/accept', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId: n.actor.id})});
      else await fetch(`/api/friends/${n.actor.id}`, {method: 'DELETE'});
    } catch {}
  };

  const shown = items.filter(n => filter === 'all' || !n.isRead);
  const DAY = 24 * 60 * 60 * 1000;
  const isNew = (n: Notification) => Date.now() - new Date(n.createdAt).getTime() < DAY;
  const fresh = shown.filter(isNew);
  const earlier = shown.filter(n => !isNew(n));
  const row = (n: Notification) => (
    <Link key={n.id} href={n.postId ? `/?post=${n.postId}` : n.actor ? `/profile/${n.actor.id}` : '/'} className={layout.notif} onClick={() => !n.isRead && markRead([n.id])}>
      <span className={layout.notifAvatar}>
        <Avatar src={n.actor?.avatarUrl ?? '/icon.svg'} alt="" size={56} />
        <span className={layout.notifType} style={{background: n.type === 'reaction' || n.type === 'friend_request' ? 'var(--fb-blue)' : n.type === 'comment' ? '#31a24c' : '#65676b'}}>
          {n.type === 'comment' ? <CommentIcon size={14} /> : n.type === 'friend_request' ? <UsersIcon size={14} /> : n.type === 'reaction' ? <LikeFilledIcon size={14} /> : <BellIcon size={14} />}
        </span>
      </span>
      <span className={layout.notifBody}>
        <div className={layout.notifMsg}>{n.message}</div>
        <div className={`${layout.notifTime} ${!n.isRead ? layout.notifTimeUnread : ''}`}>{formatCompactTime(n.createdAt)}</div>
        {n.type === 'friend_request' && n.actor && (
          <div className={layout.notifActions}>
            <button className={layout.frConfirm} onClick={e => { e.preventDefault(); void respond(n, true); }}>
              Confirm
            </button>
            <button className={layout.frDelete} onClick={e => { e.preventDefault(); void respond(n, false); }}>
              Delete
            </button>
          </div>
        )}
      </span>
      {!n.isRead && <span className={layout.notifDot} />}
    </Link>
  );

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Notifications</h1>
        <button type="button" className={styles.markAll} onClick={() => markRead('all')} disabled={!items.some(n => !n.isRead)}>
          Mark all as read
        </button>
      </div>
      <div className={layout.chipRow}>
        <button className={`${layout.chip} ${filter === 'all' ? layout.chipActive : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button className={`${layout.chip} ${filter === 'unread' ? layout.chipActive : ''}`} onClick={() => setFilter('unread')}>
          Unread
        </button>
      </div>
      {shown.length === 0 && <p className={styles.empty}>You&apos;re all caught up</p>}
      {fresh.length > 0 && <div className={layout.notifSection}><span>New</span></div>}
      {fresh.map(row)}
      {earlier.length > 0 && <div className={layout.notifSection}><span>Earlier</span></div>}
      {earlier.map(row)}
    </div>
  );
}
