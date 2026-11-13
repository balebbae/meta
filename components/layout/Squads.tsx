'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {GroupAvatar} from '@/components/messages/ChatAvatar';
import {chatApi} from '@/components/messages/api';
import {inActivities} from '@/lib/activities/mode';
import type {Conversation} from '@/lib/messaging-types';
import styles from './layout.module.css';

/** Right rail in Activities mode: the viewer's squads (their group chats, where quests and Turf games run).
 *  Renders nothing, and fetches nothing, outside the mode. */
export function Squads() {
  const on = inActivities(usePathname());
  const [squads, setSquads] = useState<Conversation[] | null>(null);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    chatApi
      .listConversations()
      .then(d => alive && setSquads(d.conversations.filter(c => c.isGroup)))
      .catch(() => alive && setSquads([]));
    return () => {
      alive = false;
    };
  }, [on]);
  if (!on) return null;
  return (
    <section className={styles.squads} aria-label="Your squads">
      <div className={styles.squadsHead}>
        <span>Your squads</span>
        <Link href="/messages/new">New</Link>
      </div>
      {squads?.slice(0, 5).map(c => (
        <Link key={c.id} href={`/messages/${c.id}`} className={styles.squad}>
          <GroupAvatar srcs={c.imageUrl ? [c.imageUrl] : c.members.map(m => m.avatarUrl)} size={40} />
          <span className={styles.squadText}>
            <span className={styles.squadName}>{c.title}</span>
            <span className={styles.squadSub}>{c.lastMessage?.body || `${c.members.length} members`}</span>
          </span>
          {c.unreadCount > 0 && (
            <span className={styles.squadLive} aria-label={`${c.unreadCount} unread`}>
              {c.unreadCount > 9 ? '9+' : c.unreadCount}
            </span>
          )}
        </Link>
      ))}
      {squads?.length === 0 && <p className={styles.squadsEmpty}>No squads yet. Start a group chat and a quest can run in it.</p>}
    </section>
  );
}
