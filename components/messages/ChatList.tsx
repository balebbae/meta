'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {ComposeIcon, MoreHorizontalIcon, SearchIcon} from '@/components/icons';
import type {Conversation} from '@/lib/messaging-types';
import {ConversationRow} from './ConversationRow';
import styles from './messages.module.css';

export type ChatFilter = 'all' | 'unread' | 'groups' | 'communities';
export const FILTERS: {key: ChatFilter; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'unread', label: 'Unread'},
  {key: 'groups', label: 'Groups'},
  {key: 'communities', label: 'Communities'},
];

export function filterConversations(list: Conversation[], filter: ChatFilter, q: string, viewerId: number): Conversation[] {
  const needle = q.trim().toLowerCase();
  return list.filter(c => {
    if (filter === 'unread' && c.unreadCount === 0) return false;
    if (filter === 'groups' && !c.isGroup) return false;
    if (filter === 'communities') return false;
    if (!needle) return true;
    return c.title.toLowerCase().includes(needle) || c.members.some(m => m.id !== viewerId && m.name.toLowerCase().includes(needle));
  });
}

export function ChatList({conversations, viewerId, activeId}: {conversations: Conversation[] | null; viewerId: number; activeId: number | null}) {
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [q, setQ] = useState('');
  const visible = useMemo(() => (conversations ? filterConversations(conversations, filter, q, viewerId) : null), [conversations, filter, q, viewerId]);
  return (
    <aside className={styles.list} aria-label="Chats">
      <div className={styles.listHead}>
        <h1 className={styles.listTitle}>Chats</h1>
        <div className={styles.listIcons}>
          <button type="button" className={styles.circleBtn} aria-label="Options">
            <MoreHorizontalIcon size={20} />
          </button>
          <Link href="/messages/new" className={styles.circleBtn} aria-label="New message">
            <ComposeIcon size={20} />
          </Link>
        </div>
      </div>
      <div className={styles.search}>
        <SearchIcon size={16} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Messenger" aria-label="Search Messenger" />
      </div>
      <div className={styles.pills} role="tablist">
        {FILTERS.map(f => (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={`${styles.pill} ${filter === f.key ? styles.pillActive : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className={styles.rows}>
        {visible === null && <div className={styles.empty}>Loading chats…</div>}
        {visible?.map(c => (
          <ConversationRow key={c.id} c={c} viewerId={viewerId} active={c.id === activeId} />
        ))}
        {visible && visible.length === 0 && <div className={styles.empty}>{filter === 'communities' ? 'No community chats yet' : q ? 'No results' : 'No chats yet'}</div>}
      </div>
    </aside>
  );
}
