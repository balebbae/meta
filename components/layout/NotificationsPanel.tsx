'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {BellIcon, CommentIcon, LikeFilledIcon, MoreHorizontalIcon, UsersIcon} from '@/components/icons';
import {formatCompactTime} from '@/lib/format';
import type {Notification} from '@/lib/queries';
import {Skeleton} from '@/components/ui/Skeleton';
import styles from './layout.module.css';

export function NotificationsPanel({open, onUnread}: {open: boolean; onUnread: (n: number) => void}) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!open) return;
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then((d: {notifications: Notification[]; unreadCount: number} | null) => {
        if (!d) return;
        setItems(d.notifications);
        onUnread(d.unreadCount);
      })
      .catch(() => {});
  }, [open, onUnread]);

  const markRead = async (ids: number[] | 'all') => {
    setItems(list =>
      list?.map(n => (ids === 'all' || ids.includes(n.id) ? {...n, isRead: true} : n)) ?? null,
    );
    const remaining = (items ?? []).filter(n => !n.isRead && !(ids === 'all' || ids.includes(n.id))).length;
    onUnread(remaining);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(ids === 'all' ? {all: true} : {ids}),
    });
  };

  const shown = (items ?? []).filter(n => filter === 'all' || !n.isRead);
  const DAY = 24 * 60 * 60 * 1000;
  const isNew = (n: Notification) => Date.now() - new Date(n.createdAt).getTime() < DAY;
  const fresh = shown.filter(isNew);
  const earlier = shown.filter(n => !isNew(n));
  const respond = async (n: Notification, accept: boolean) => {
    if (!n.actor) return;
    setItems(list => list?.filter(x => x.id !== n.id) ?? null);
    markRead([n.id]);
    try {
      if (accept) await fetch('/api/friends/accept', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId: n.actor.id})});
      else await fetch(`/api/friends/${n.actor.id}`, {method: 'DELETE'});
    } catch {}
  };
  const row = (n: Notification) => (
    <Link key={n.id} href={n.postId ? `/?post=${n.postId}` : n.actor ? `/profile/${n.actor.id}` : '/'} className={styles.notif} onClick={() => !n.isRead && markRead([n.id])}>
      <span className={styles.notifAvatar}>
        <Avatar src={n.actor?.avatarUrl ?? '/favicon.svg'} alt="" size={56} />
        <span className={styles.notifType} style={{background: n.type === 'reaction' ? 'var(--fb-blue)' : n.type === 'comment' ? '#31a24c' : n.type === 'friend_request' ? 'var(--fb-blue)' : '#65676b'}}>
          {n.type === 'comment' ? <CommentIcon size={14} /> : n.type === 'friend_request' ? <UsersIcon size={14} /> : n.type === 'reaction' ? <LikeFilledIcon size={14} /> : <BellIcon size={14} />}
        </span>
      </span>
      <span className={styles.notifBody}>
        <div className={styles.notifMsg}>{n.message}</div>
        <div className={`${styles.notifTime} ${!n.isRead ? styles.notifTimeUnread : ''}`}>{formatCompactTime(n.createdAt)}</div>
        {n.type === 'friend_request' && n.actor && (
          <div className={styles.notifActions}>
            <button className={styles.frConfirm} onClick={e => { e.preventDefault(); respond(n, true); }}>
              Confirm
            </button>
            <button className={styles.frDelete} onClick={e => { e.preventDefault(); respond(n, false); }}>
              Delete
            </button>
          </div>
        )}
      </span>
      {!n.isRead && <span className={styles.notifDot} />}
    </Link>
  );
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>Notifications</div>
        <button className={styles.rrIconBtn} aria-label="Mark all as read" title="Mark all as read" onClick={() => markRead('all')}>
          <MoreHorizontalIcon size={20} />
        </button>
      </div>
      <div className={styles.chipRow}>
        <button className={`${styles.chip} ${filter === 'all' ? styles.chipActive : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button className={`${styles.chip} ${filter === 'unread' ? styles.chipActive : ''}`} onClick={() => setFilter('unread')}>
          Unread
        </button>
      </div>
      {items === null && (
        <div role="status" aria-label="Loading notifications">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={styles.notifSkeleton}>
              <Skeleton w={56} h={56} r="50%" />
              <div className={styles.notifSkeletonLines}>
                <Skeleton w={i % 2 ? '70%' : '85%'} h={12} />
                <Skeleton w="30%" h={10} />
              </div>
            </div>
          ))}
        </div>
      )}
      {items !== null && shown.length === 0 && <div className={styles.searchEmpty}>You&apos;re all caught up</div>}
      {fresh.length > 0 && (
        <div className={styles.notifSection}>
          <span>New</span>
          <Link href="/friends" className={styles.linkBtn}>
            See all
          </Link>
        </div>
      )}
      {fresh.map(row)}
      {earlier.length > 0 && (
        <div className={styles.notifSection}>
          <span>Earlier</span>
          {fresh.length === 0 && (
            <Link href="/friends" className={styles.linkBtn}>
              See all
            </Link>
          )}
        </div>
      )}
      {earlier.map(row)}
    </div>
  );
}
