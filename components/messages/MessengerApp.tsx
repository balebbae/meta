'use client';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useState} from 'react';
import type {ChatUser, Conversation, Message} from '@/lib/messaging-types';
import type {User} from '@/lib/types';
import {chatApi} from './api';
import {ChatList} from './ChatList';
import {useConversationLive, useConversations} from './hooks';
import {InfoPanel} from './InfoPanel';
import {NewChat} from './NewChat';
import {Thread} from './Thread';
import styles from './messages.module.css';

export function MessengerApp({
  viewer,
  initialConversations,
  activeId,
  mode = 'thread',
  contacts,
}: {
  viewer: User;
  initialConversations: Conversation[];
  activeId: number | null;
  mode?: 'thread' | 'new';
  contacts: ChatUser[];
}) {
  const router = useRouter();
  const {conversations, refresh, patch} = useConversations(initialConversations);
  // null = not toggled yet: CSS decides (open on wide screens, hidden below 1100px) so SSR and client markup match
  const [infoOpen, setInfoOpen] = useState<boolean | null>(null);
  const active = activeId != null ? (conversations ?? []).find(c => c.id === activeId) ?? null : null;

  const markRead = useCallback(
    (id: number) => {
      patch(id, c => ({...c, unreadCount: 0}));
      chatApi.markRead(id).catch(() => {});
    },
    [patch],
  );

  const onNewFromOthers = useCallback(
    (msgs: Message[]) => {
      if (activeId == null) return;
      const last = msgs[msgs.length - 1];
      patch(activeId, c => ({...c, lastMessage: last, updatedAt: last.createdAt}));
      if (document.visibilityState === 'visible') markRead(activeId);
      void refresh();
    },
    [activeId, patch, markRead, refresh],
  );

  // once the list no longer contains the thread (left/removed/deleted) stop polling it, otherwise every tick is a 404
  const notFound = mode === 'thread' && activeId != null && conversations != null && !active;
  const live = useConversationLive(mode === 'thread' && !notFound ? activeId : null, viewer, {onNewFromOthers});

  // opening a thread marks it read
  useEffect(() => {
    if (mode !== 'thread' || activeId == null || notFound) return;
    markRead(activeId);
  }, [activeId, mode, markRead, notFound]);

  // list reflects my optimistic sends immediately
  const onSend = useCallback(
    async (body: string, imageUrl: string | null) => {
      if (activeId == null) return;
      const now = new Date().toISOString();
      patch(activeId, c => ({
        ...c,
        updatedAt: now,
        lastMessage: {id: -1, conversationId: activeId, sender: {id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl}, body, imageUrl, kind: 'text', payload: null, createdAt: now},
      }));
      await live.send(body, imageUrl);
      void refresh();
    },
    [activeId, patch, live, viewer, refresh],
  );

  return (
    <div data-layout="full" className={styles.app} data-active={String(mode === 'new' || activeId != null)}>
      <ChatList conversations={conversations} viewerId={viewer.id} activeId={activeId} />
      {mode === 'new' ? (
        <NewChat contacts={contacts} />
      ) : active ? (
        <>
          <Thread
            conversation={active}
            viewerId={viewer.id}
            messages={live.messages}
            loading={live.loading}
            hasMore={live.hasMore}
            onLoadOlder={live.loadOlder}
            onSend={onSend}
            onRetry={live.retry}
            infoOpen={infoOpen ?? true}
            onToggleInfo={() => setInfoOpen(o => !(o ?? window.innerWidth >= 1100))}
          />
          {infoOpen !== false && (
            <InfoPanel
              auto={infoOpen === null}
              conversation={active}
              viewerId={viewer.id}
              messages={live.messages}
              contacts={contacts}
              onUpdated={c => patch(c.id, () => c)}
              onLeft={() => {
                router.push('/messages');
                void refresh();
              }}
            />
          )}
        </>
      ) : (
        <section className={styles.thread}>
          <div className={styles.noChat}>{notFound ? 'This chat is not available' : 'No chats selected'}</div>
        </section>
      )}
    </div>
  );
}
