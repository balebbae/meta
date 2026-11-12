'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import type {ChatUser} from '@/lib/messaging-types';
import {chatApi} from './api';
import {Composer} from './Composer';
import {PeoplePicker} from './PeoplePicker';
import styles from './messages.module.css';

/** Compose flow: pick people; one person opens/creates the DM, several create a group (with an optional name). */
export function NewChat({contacts}: {contacts: ChatUser[]}) {
  const router = useRouter();
  const [picked, setPicked] = useState<ChatUser[]>([]);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async (name?: string, firstMessage?: {body: string; imageUrl: string | null}) => {
    setBusy(true);
    setErr(null);
    try {
      const d = await chatApi.createConversation(picked.map(p => p.id), name);
      if (firstMessage) await chatApi.sendMessage(d.conversation.id, firstMessage.body, firstMessage.imageUrl);
      router.push(`/messages/${d.conversation.id}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className={styles.thread} aria-label="New message">
      <div className={styles.threadHead} style={{boxShadow: 'none', height: 'auto', padding: 0}} />
      <PeoplePicker selected={picked} onChange={setPicked} suggestions={contacts} autoFocus />
      {err && <div style={{color: 'var(--fb-red)', fontSize: 13, padding: '0 16px'}}>{err}</div>}
      {picked.length > 0 && (
        <div className={styles.newActions}>
          {picked.length === 1 ? (
            <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void create()}>
              Open chat with {picked[0].name.split(' ')[0]}
            </button>
          ) : (
            <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => setGroupDialog(true)}>
              Create group chat ({picked.length + 1})
            </button>
          )}
        </div>
      )}
      <Composer disabled={picked.length === 0 || busy} onSend={(body, imageUrl) => create(undefined, {body, imageUrl})} />

      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} title="New group chat" width={548}>
        <form
          className={styles.dialogBody}
          onSubmit={e => {
            e.preventDefault();
            setGroupDialog(false);
            void create(groupName.trim() || undefined);
          }}>
          <div className={styles.dialogText}>
            With {picked.map(p => p.name.split(' ')[0]).join(', ')} and you.
          </div>
          <input className={styles.field} value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name (optional)" maxLength={80} autoFocus aria-label="Group name" />
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setGroupDialog(false)}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={busy}>
              Create
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
