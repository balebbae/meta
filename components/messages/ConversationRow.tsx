'use client';
import Link from 'next/link';
import {formatCompactTime} from '@/lib/format';
import type {Conversation} from '@/lib/messaging-types';
import {ChatAvatar, GroupAvatar} from './ChatAvatar';
import styles from './messages.module.css';

export function previewText(c: Conversation, viewerId: number): string {
  const m = c.lastMessage;
  if (!m) return c.isGroup ? 'You created the group' : 'Say hi 👋';
  const who = m.sender ? (m.sender.id === viewerId ? 'You' : m.sender.name.split(' ')[0]) : '';
  const text = m.body || (m.imageUrl ? 'Sent a photo.' : '');
  if (!who) return text;
  if (m.sender?.id === viewerId) return `You: ${text}`;
  return c.isGroup ? `${who}: ${text}` : text;
}

export function ConversationAvatar({c, size = 56, viewerId}: {c: Conversation; size?: number; viewerId?: number}) {
  if (c.isGroup && !c.imageUrl) {
    const others = c.members.filter(m => m.id !== viewerId);
    return <GroupAvatar srcs={(others.length >= 2 ? others : c.members).slice(0, 2).map(m => m.avatarUrl)} size={size} />;
  }
  return <ChatAvatar src={c.imageUrl} alt="" size={size} online={c.isOnline} />;
}

export function ConversationRow({c, viewerId, active, onClick, size = 56}: {c: Conversation; viewerId: number; active?: boolean; onClick?: () => void; size?: number}) {
  const unread = c.unreadCount > 0;
  const time = c.lastMessage ? formatCompactTime(c.lastMessage.createdAt) : formatCompactTime(c.updatedAt);
  return (
    <Link href={`/messages/${c.id}`} className={`${styles.row} ${active ? styles.rowActive : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <ConversationAvatar c={c} size={size} viewerId={viewerId} />
      <span className={styles.rowBody}>
        <span className={`${styles.rowName} ${unread ? styles.rowNameUnread : ''}`}>{c.title}</span>
        <span className={`${styles.rowPreview} ${unread ? styles.rowPreviewUnread : ''}`}>
          <span>{previewText(c, viewerId)}</span>
          <span className={styles.time}>· {time}</span>
        </span>
      </span>
      {unread && <span className={styles.dot} aria-label={`${c.unreadCount} unread`} />}
    </Link>
  );
}
