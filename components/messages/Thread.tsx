'use client';
import Link from 'next/link';
import {Fragment, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeftIcon} from '@/components/icons';
import {formatFullDate} from '@/lib/format';
import type {Conversation, Message} from '@/lib/messaging-types';
import {ChatAvatar} from './ChatAvatar';
import {Composer} from './Composer';
import {RallySheet} from '@/components/rally/RallySheet';
import {ConversationAvatar} from './ConversationRow';
import {CallButtons} from './CallButtons';
import {InfoCircleIcon} from './icons';
import {Skeleton} from '@/components/ui/Skeleton';
import styles from './messages.module.css';
import {MessageCard} from '@/components/messages/cards';

const ONE_MIN = 60_000;
const GAP = 60 * ONE_MIN;

function dividerLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return time;
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return `${d.toLocaleDateString([], {weekday: 'short'})} ${time}`;
  return `${d.toLocaleDateString([], {month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric'})}, ${time}`;
}

const isEmojiOnly = (s: string) => /^\p{Extended_Pictographic}{1,3}$/u.test(s.trim());

export function Thread({
  conversation,
  viewerId,
  messages,
  loading,
  hasMore,
  onLoadOlder,
  onSend,
  onRetry,
  infoOpen,
  onToggleInfo,
}: {
  conversation: Conversation;
  viewerId: number;
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  onLoadOlder: () => void;
  onSend: (body: string, imageUrl: string | null) => Promise<void> | void;
  onRetry: (tempId: number) => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
}) {
  const [rallyOpen, setRallyOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const lastCountRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickRef.current || messages.length !== lastCountRef.current) {
      const last = messages[messages.length - 1];
      if (stickRef.current || last?.sender?.id === viewerId) el.scrollTop = el.scrollHeight;
    }
    lastCountRef.current = messages.length;
  }, [messages, viewerId, conversation.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasMore && !loading) onLoadOlder();
  };

  // who has read what: member id -> last read message id (others only)
  const seenAt = useMemo(() => {
    const map = new Map<number, Conversation['members']>();
    for (const m of conversation.members) {
      if (m.id === viewerId || m.lastReadMessageId == null) continue;
      const list = map.get(m.lastReadMessageId) ?? [];
      list.push(m);
      map.set(m.lastReadMessageId, list);
    }
    return map;
  }, [conversation.members, viewerId]);

  const others = conversation.members.filter(m => m.id !== viewerId);
  const subtitle = conversation.isGroup ? `${conversation.members.length} members` : conversation.isOnline ? 'Active now' : 'Offline';
  const lastMine = [...messages].reverse().find(m => m.sender?.id === viewerId && m.id > 0);

  return (
    <section className={styles.thread} aria-label={`Conversation with ${conversation.title}`}>
      <header className={styles.threadHead}>
        <Link href="/messages" className={`${styles.iconBtn} ${styles.backBtn}`} aria-label="Back to chats">
          <ArrowLeftIcon size={20} />
        </Link>
        <ConversationAvatar c={conversation} size={40} viewerId={viewerId} />
        <div className={styles.threadHeadInfo}>
          <div className={styles.threadName}>{conversation.title}</div>
          <div className={styles.threadSub}>{subtitle}</div>
        </div>
        <div className={styles.threadActions}>
          <button type="button" className={`${styles.iconBtn} ${rallyOpen ? styles.iconBtnActive : ''}`} aria-label="Rally: start a quest" title="Rally" onClick={() => setRallyOpen(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden><path d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.5 6.6 18.5l1.2-6L3.3 8.3l6.1-.7z" /></svg>
          </button>
          <CallButtons conversationId={conversation.id} viewerId={viewerId} />
          <button type="button" className={`${styles.iconBtn} ${infoOpen ? styles.iconBtnActive : ''}`} aria-label="Conversation information" aria-pressed={infoOpen} onClick={onToggleInfo}>
            <InfoCircleIcon size={20} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className={styles.messages} onScroll={onScroll}>
        {!hasMore && !loading && (
          <div className={styles.messagesIntro}>
            <ConversationAvatar c={conversation} size={80} viewerId={viewerId} />
            <div className={styles.messagesIntroName}>{conversation.title}</div>
            {conversation.isGroup && (
              <div className={styles.messagesIntroSub}>
                {`${others.map(m => m.name.split(' ')[0]).join(', ')} and you are in this chat`}
              </div>
            )}
          </div>
        )}
        {loading && (
          <div className={styles.skeletonBubbles} role="status" aria-label="Loading messages">
            {[200, 120, 260, 90, 180].map((w, i) => (
              <Skeleton key={i} w={w} h={36} r={18} style={{alignSelf: i % 2 ? 'flex-end' : 'flex-start'}} />
            ))}
          </div>
        )}
        {messages.map((m, i) => {
          if (m.kind === 'system') {
            return (
              <div key={m.id} className={styles.divider} title={formatFullDate(m.createdAt)}>
                {(m.payload?.text as string | undefined) ?? m.body}
              </div>
            );
          }
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const mine = m.sender?.id === viewerId;
          const t = new Date(m.createdAt).getTime();
          const showDivider = !prev || t - new Date(prev.createdAt).getTime() > GAP;
          const sameAsPrev = !!prev && !showDivider && prev.sender?.id === m.sender?.id && t - new Date(prev.createdAt).getTime() < ONE_MIN;
          const sameAsNext = !!next && next.sender?.id === m.sender?.id && new Date(next.createdAt).getTime() - t < ONE_MIN && new Date(next.createdAt).getTime() - t <= GAP;
          const pos = sameAsPrev && sameAsNext ? 'middle' : sameAsPrev ? 'last' : sameAsNext ? 'first' : 'only';
          const seenBy = (seenAt.get(m.id) ?? []).filter(s => s.id !== m.sender?.id);
          const emoji = isEmojiOnly(m.body) && !m.imageUrl;
          return (
            <Fragment key={m.id}>
              {showDivider && <div className={styles.divider}>{dividerLabel(m.createdAt)}</div>}
              {!mine && conversation.isGroup && !sameAsPrev && <div className={styles.senderName}>{m.sender?.name ?? 'Unknown'}</div>}
              <div className={`${styles.msgRow} ${mine ? styles.msgRowMine : styles.msgRowOther} ${!sameAsPrev && !showDivider ? styles.msgRowGap : ''}`}>
                {!mine && <span className={styles.msgAvatarSlot}>{!sameAsNext && m.sender && <ChatAvatar src={m.sender.avatarUrl} size={28} />}</span>}
                <div className={styles.bubbleWrap}>
                  {m.kind !== 'text' && <MessageCard message={m} viewerId={viewerId} conversation={conversation} />}
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt="" className={styles.bubbleImg} style={m.body ? {marginBottom: 4} : undefined} />
                  )}
                  {m.body && m.kind === 'text' && (
                    <div
                      className={`${styles.bubble} ${styles[pos]} ${mine ? styles.bubbleMine : ''} ${emoji ? styles.bubbleEmoji : ''} ${m.pending ? styles.bubblePending : ''} ${m.failed ? styles.bubbleFailed : ''}`}
                      title={formatFullDate(m.createdAt)}>
                      {m.body}
                    </div>
                  )}
                  {m.failed && (
                    <button type="button" className={styles.sentState} style={{color: 'var(--fb-red)'}} onClick={() => onRetry(m.id)}>
                      Couldn&apos;t send. Tap to retry
                    </button>
                  )}
                </div>
                <span className={styles.hoverTime}>{formatFullDate(m.createdAt)}</span>
              </div>
              {seenBy.length > 0 && (
                <div className={`${styles.seenRow} ${mine ? '' : styles.seenRowOther}`} title={`Seen by ${seenBy.map(s => s.name).join(', ')}`}>
                  {seenBy.slice(0, 6).map(s => (
                    <ChatAvatar key={s.id} src={s.avatarUrl} size={16} />
                  ))}
                </div>
              )}
              {mine && m.id === lastMine?.id && seenBy.length === 0 && !m.pending && !m.failed && (
                <div className={styles.sentState}>{conversation.members.some(x => x.id !== viewerId && (x.lastReadMessageId ?? 0) >= m.id) ? 'Seen' : 'Sent'}</div>
              )}
              {m.pending && <div className={styles.sentState}>Sending…</div>}
            </Fragment>
          );
        })}
      </div>
      <Composer onSend={onSend} autoFocus onRally={() => setRallyOpen(true)} />
      <RallySheet conversationId={conversation.id} viewerId={viewerId} open={rallyOpen} onClose={() => setRallyOpen(false)} />
    </section>
  );
}
