'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ComposeIcon, ExpandIcon, MoreHorizontalIcon, SearchIcon} from '@/components/icons';
import {ChatFilter, FILTERS, filterConversations} from '@/components/messages/ChatList';
import {ConversationRow} from '@/components/messages/ConversationRow';
import {useConversations} from '@/components/messages/hooks';
import msgStyles from '@/components/messages/messages.module.css';
import styles from './layout.module.css';

export {useMessengerUnread} from '@/components/messages/hooks';

/** Header "Chats" popover backed by /api/conversations (polls every 5s while open). */
export function MessengerPanel({open, viewerId, onUnread, onNavigate}: {open: boolean; viewerId: number; onUnread: (n: number) => void; onNavigate: () => void}) {
  const {conversations, refresh} = useConversations(null, 5000);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);
  useEffect(() => {
    if (conversations) onUnread(conversations.filter(c => c.unreadCount > 0).length);
  }, [conversations, onUnread]);

  const visible = useMemo(() => (conversations ? filterConversations(conversations, filter, q, viewerId) : null), [conversations, filter, q, viewerId]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>Chats</div>
        <span className={styles.panelIcons}>
          <button className={styles.rrIconBtn} aria-label="Options">
            <MoreHorizontalIcon size={20} />
          </button>
          <Link href="/messages" className={styles.rrIconBtn} aria-label="See all in Messenger" onClick={onNavigate}>
            <ExpandIcon size={18} />
          </Link>
          <Link href="/messages/new" className={styles.rrIconBtn} aria-label="New message" onClick={onNavigate}>
            <ComposeIcon size={20} />
          </Link>
        </span>
      </div>
      <div className={styles.msgSearch}>
        <SearchIcon size={16} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Messenger" aria-label="Search Messenger" />
      </div>
      <div className={styles.chipRow}>
        {FILTERS.map(f => (
          <button key={f.key} className={`${styles.chip} ${filter === f.key ? styles.chipActive : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {visible === null && <div className={styles.searchEmpty}>Loading chats…</div>}
      {visible?.map(c => (
        <ConversationRow key={c.id} c={c} viewerId={viewerId} onClick={onNavigate} />
      ))}
      {visible && visible.length === 0 && <div className={styles.searchEmpty}>{q ? 'No results' : 'No conversations yet'}</div>}
      <div style={{textAlign: 'center', padding: 8, borderTop: `1px solid var(--fb-divider-soft)`, marginTop: 4}}>
        <Link href="/messages" className={`${styles.linkBtn} ${msgStyles.seeAll}`} onClick={onNavigate}>
          See all in Messenger
        </Link>
      </div>
    </div>
  );
}
