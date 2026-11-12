'use client';

import {useEffect, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {PeoplePicker} from '@/components/messages/PeoplePicker';
import {chatApi} from '@/components/messages/api';
import type {ChatUser, Conversation} from '@/lib/messaging-types';
import type {Reel} from '@/lib/reels';
import styles from './reels.module.css';

type Props = {
  reel: Reel;
  onClose: () => void;
  onSent: (groupName: string, conversationId: number) => void;
  onError: (text: string) => void;
};

function groupName(c: Conversation) {
  return c.title || c.members.map(m => m.name.split(' ')[0]).join(', ');
}

export default function ChallengeDialog({reel, onClose, onSent, onError}: Props) {
  const [groups, setGroups] = useState<Conversation[] | null>(null);
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [newName, setNewName] = useState('');
  const [members, setMembers] = useState<ChatUser[]>([]);
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    chatApi
      .listConversations()
      .then(({conversations}) => {
        const list = conversations;
        if (!cancelled) setGroups(list.filter(c => c.isGroup));
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (conversationId: number, name: string) => {
    setError(null);
    const res = await fetch('/api/games/from-reel', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({reelId: reel.id, conversationId}),
    });
    if (res.status === 501) {
      onError('Rally is not wired up yet, so the quest could not be created. The group is ready for it.');
      onClose();
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {error?: string};
      throw new Error(data.error || `Could not send (${res.status})`);
    }
    onSent(name, conversationId);
  };

  const pick = async (c: Conversation) => {
    setBusy(c.id);
    try {
      await send(c.id, groupName(c));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setBusy(null);
    }
  };

  const createAndSend = async () => {
    if (members.length < 2) {
      setError('Pick at least two people for a group.');
      return;
    }
    setBusy('new');
    setError(null);
    try {
      const {conversation: convo} = await chatApi.createConversation(members.map(m => m.id), newName.trim() || undefined);
      await send(convo.id, groupName(convo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create group');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open title={mode === 'pick' ? 'Challenge the GC' : 'New group'} onClose={onClose} width={480} onBack={mode === 'new' ? () => setMode('pick') : undefined}>
      <div className={styles.dlgBody}>
        <div className={styles.dlgIntro}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.dlgPoster} src={reel.posterUrl ?? undefined} alt="" />
          <div>
            Send this Reel as a Rally quest.{' '}
            {reel.exercises.length > 0 && (
              <>
                Everyone in the group does <strong>{reel.exercises.map(e => e.name).join(', ')}</strong>.
              </>
            )}
          </div>
        </div>

        {mode === 'pick' ? (
          <>
            <div className={styles.dlgList}>
              <div className={styles.dlgHeading}>Your group chats</div>
              {groups === null && (
                <div className={styles.dlgRow}>
                  <span className={styles.spinner} /> Loading…
                </div>
              )}
              {groups?.length === 0 && <div className={`${styles.dlgRow} ${styles.dlgRowSub}`}>No group chats yet. Start one below.</div>}
              {groups?.map(c => (
                <button key={c.id} type="button" className={styles.dlgRow} disabled={busy !== null} onClick={() => pick(c)}>
                  <GroupAvatar convo={c} />
                  <span>
                    {groupName(c)}
                    <span className={styles.dlgRowSub}>{c.members.length + 1} members</span>
                  </span>
                  {busy === c.id && <span className={styles.spinner} style={{marginLeft: 'auto'}} />}
                </button>
              ))}
              <button type="button" className={styles.dlgRow} disabled={busy !== null} onClick={() => setMode('new')}>
                <span className={styles.dlgNewIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1z" />
                  </svg>
                </span>
                <span>
                  New group
                  <span className={styles.dlgRowSub}>Pick friends and start a fresh GC</span>
                </span>
              </button>
            </div>
            {busy !== null && <div className={styles.dlgRowSub} style={{padding: '8px 16px 0'}}>Building the quest with Muse… this can take up to a minute.</div>}
            {error && <div className={styles.dlgError}>{error}</div>}
          </>
        ) : (
          <>
            <input className={styles.dlgField} placeholder="Group name (optional)" value={newName} onChange={e => setNewName(e.target.value)} />
            <div className={styles.dlgList}>
              <PeoplePicker selected={members} onChange={setMembers} autoFocus />
            </div>
            {error && <div className={styles.dlgError}>{error}</div>}
            <div className={styles.dlgActions}>
              <button type="button" className="fb-btn fb-btn-secondary" onClick={() => setMode('pick')} disabled={busy !== null}>
                Back
              </button>
              <button type="button" className="fb-btn fb-btn-primary" onClick={createAndSend} disabled={busy !== null || members.length < 2}>
                {busy === 'new' ? 'Sending…' : 'Create & send'}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function GroupAvatar({convo}: {convo: Conversation}) {
  const [a, b] = convo.members;
  return (
    <span style={{position: 'relative', width: 40, height: 40, flexShrink: 0}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {a && <img src={a.avatarUrl} alt="" width={28} height={28} style={{borderRadius: '50%', position: 'absolute', right: 0, top: 0, objectFit: 'cover'}} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {b && (
        <img
          src={b.avatarUrl}
          alt=""
          width={28}
          height={28}
          style={{borderRadius: '50%', position: 'absolute', left: 0, bottom: 0, objectFit: 'cover', border: '2px solid var(--fb-card)'}}
        />
      )}
    </span>
  );
}
