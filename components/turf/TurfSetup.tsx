'use client';
import {useEffect, useState} from 'react';
import type {ChatUser, Conversation} from '@/lib/messaging-types';
import {chatApi} from '@/components/messages/api';
import {PeoplePicker} from '@/components/messages/PeoplePicker';
import {TurfCreateForm} from './TurfCreateForm';
import styles from './turf.module.css';

export function TurfSetup({viewerId}: {viewerId: number}) {
  const [chats, setChats] = useState<Conversation[] | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [picked, setPicked] = useState<ChatUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    chatApi.listConversations().then(d => {
      if (!alive) return;
      const list = d.conversations.filter(c => c.members.some(m => m.id !== viewerId));
      setChats(list);
      setChatId(list[0]?.id ?? null);
      setCreatingChat(list.length === 0);
    }).catch(e => {
      if (!alive) return;
      setError(e instanceof Error ? e.message : 'Could not load chats. You can create a chat below.');
      setChats([]);
      setCreatingChat(true);
    });
    return () => { alive = false; };
  }, [viewerId]);

  const createChat = async () => {
    setBusy(true);
    setError(null);
    try {
      const {conversation} = await chatApi.createConversation(picked.map(p => p.id), picked.length > 1 ? 'Turf with friends' : undefined);
      setChats(prev => [conversation, ...(prev ?? []).filter(c => c.id !== conversation.id)]);
      setChatId(conversation.id);
      setCreatingChat(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the chat');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.actions}>
      <p className={styles.muted}>Choose your friends, pick an arena, then invite them. Friends see claimed cells, never your route. Strava is optional: live GPS and GPX work too.</p>
      {chats == null ? <p role="status">Loading chats…</p> : <>
        {chats.length > 0 && <label className={styles.field}>
          Play in
          <select className={styles.input} value={creatingChat ? 'new' : String(chatId ?? '')} disabled={busy} onChange={e => {
            setCreatingChat(e.target.value === 'new');
            if (e.target.value !== 'new') setChatId(Number(e.target.value));
            setError(null);
          }}>
            {chats.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            <option value="new">New chat with friends</option>
          </select>
        </label>}
        {creatingChat ? <>
          <p className={styles.muted}>Search for up to 7 friends to play with.</p>
          <PeoplePicker selected={picked} onChange={setPicked} exclude={[viewerId]} label="Invite:" />
          <button type="button" className={styles.btnPrimary} disabled={busy || picked.length === 0 || picked.length > 7} onClick={() => void createChat()}>
            {busy ? 'Creating chat…' : 'Use these friends'}
          </button>
        </> : chatId != null && <TurfCreateForm key={chatId} conversationId={chatId} viewerId={viewerId} />}
      </>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
