'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ChevronDownIcon, ChevronUpIcon, PencilIcon, PhotoIcon, PlusIcon, SearchIcon} from '@/components/icons';
import {Dialog} from '@/components/ui/Dialog';
import type {ChatUser, Conversation, Message} from '@/lib/messaging-types';
import {chatApi} from './api';
import {ChatAvatar} from './ChatAvatar';
import {ConversationAvatar} from './ConversationRow';
import {fileToDataUrl} from './hooks';
import {BellOffIcon, LeaveIcon, UserCircleIcon} from './icons';
import {PeoplePicker} from './PeoplePicker';
import styles from './messages.module.css';

function Section({title, defaultOpen = false, children}: {title: string; defaultOpen?: boolean; children: React.ReactNode}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHead} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {title}
        {open ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
      {open && children}
    </div>
  );
}

export function InfoPanel({
  auto = false,
  conversation,
  viewerId,
  messages,
  contacts,
  onUpdated,
  onLeft,
}: {
  auto?: boolean;
  conversation: Conversation;
  viewerId: number;
  messages: Message[];
  contacts: ChatUser[];
  onUpdated: (c: Conversation) => void;
  onLeft: () => void;
}) {
  const [dialog, setDialog] = useState<'name' | 'add' | 'leave' | null>(null);
  const [name, setName] = useState(conversation.title);
  const [picked, setPicked] = useState<ChatUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const others = conversation.members.filter(m => m.id !== viewerId);
  const media = messages.filter(m => m.imageUrl);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      setDialog(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const changePhoto = async (file?: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file, 512);
    const d = await chatApi.update(conversation.id, {imageUrl: dataUrl});
    onUpdated(d.conversation);
  };

  return (
    <aside className={`${styles.info} ${auto ? styles.infoAuto : ''}`} aria-label="Conversation information">
      <div className={styles.infoTop}>
        <ConversationAvatar c={conversation} size={80} viewerId={viewerId} />
        <div className={styles.infoName}>{conversation.title}</div>
        <div className={styles.infoSub}>{conversation.isGroup ? `${conversation.members.length} members` : conversation.isOnline ? 'Active now' : 'Encrypted'}</div>
      </div>
      <div className={styles.infoActions}>
        {!conversation.isGroup && others[0] && (
          <Link href={`/profile/${others[0].id}`} className={styles.infoAction}>
            <span className={styles.circleBtn}>
              <UserCircleIcon size={20} />
            </span>
            Profile
          </Link>
        )}
        <button type="button" className={styles.infoAction}>
          <span className={styles.circleBtn}>
            <BellOffIcon size={20} />
          </span>
          Mute
        </button>
        <button type="button" className={styles.infoAction}>
          <span className={styles.circleBtn}>
            <SearchIcon size={20} />
          </span>
          Search
        </button>
      </div>

      <Section title="Chat info">
        <div className={styles.sectionItem} style={{fontSize: 13, color: 'var(--fb-text-secondary)'}}>
          {conversation.isGroup ? `Created ${new Date(conversation.createdAt).toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})}` : 'Pinned messages will appear here'}
        </div>
      </Section>

      {conversation.isGroup && (
        <Section title="Customize chat" defaultOpen>
          <button
            type="button"
            className={styles.sectionItem}
            onClick={() => {
              setName(conversation.title);
              setDialog('name');
            }}>
            <span className={styles.sectionItemIcon}>
              <PencilIcon size={18} />
            </span>
            Change chat name
          </button>
          <label className={styles.sectionItem} style={{cursor: 'pointer'}}>
            <span className={styles.sectionItemIcon}>
              <PhotoIcon size={18} />
            </span>
            Change photo
            <input type="file" accept="image/*" className={styles.hiddenInput} onChange={e => void changePhoto(e.target.files?.[0])} />
          </label>
        </Section>
      )}

      <Section title="Chat members" defaultOpen>
        {conversation.members.map(m => (
          <Link key={m.id} href={`/profile/${m.id}`} className={styles.memberRow}>
            <ChatAvatar src={m.avatarUrl} size={36} online={m.isOnline} />
            <span>
              <div className={styles.memberName}>
                {m.name}
                {m.id === viewerId ? ' (You)' : ''}
              </div>
              {conversation.isGroup && <div className={styles.memberRole}>{m.role === 'admin' ? 'Admin' : 'Member'}</div>}
            </span>
          </Link>
        ))}
        {conversation.isGroup && (
          <button
            type="button"
            className={styles.sectionItem}
            onClick={() => {
              setPicked([]);
              setDialog('add');
            }}>
            <span className={styles.sectionItemIcon}>
              <PlusIcon size={18} />
            </span>
            Add people
          </button>
        )}
      </Section>

      <Section title="Media & files" defaultOpen={media.length > 0}>
        {media.length === 0 ? (
          <div className={styles.sectionItem} style={{fontSize: 13, color: 'var(--fb-text-secondary)'}}>
            No photos or files yet
          </div>
        ) : (
          <div className={styles.mediaGrid}>
            {media.slice(-9).reverse().map(m => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={m.imageUrl!} alt="" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Privacy & support" defaultOpen={conversation.isGroup}>
        {conversation.isGroup && (
          <button type="button" className={`${styles.sectionItem} ${styles.sectionItemDanger}`} onClick={() => setDialog('leave')}>
            <span className={styles.sectionItemIcon} style={{color: 'var(--fb-red)'}}>
              <LeaveIcon size={18} />
            </span>
            Leave group
          </button>
        )}
        {!conversation.isGroup && (
          <div className={styles.sectionItem} style={{fontSize: 13, color: 'var(--fb-text-secondary)'}}>
            Messages are stored in your account
          </div>
        )}
      </Section>

      <Dialog open={dialog === 'name'} onClose={() => setDialog(null)} title="Change chat name" width={548}>
        <form
          className={styles.dialogBody}
          onSubmit={e => {
            e.preventDefault();
            void run(async () => {
              const d = await chatApi.update(conversation.id, {name: name.trim()});
              onUpdated(d.conversation);
            });
          }}>
          <div className={styles.dialogText}>Changing the name of a group chat changes it for everyone.</div>
          <input className={styles.field} value={name} onChange={e => setName(e.target.value)} maxLength={80} autoFocus aria-label="Chat name" />
          {err && <div style={{color: 'var(--fb-red)', fontSize: 13}}>{err}</div>}
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={busy || !name.trim()}>
              Save
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog === 'add'} onClose={() => setDialog(null)} title="Add people" width={548}>
        <div style={{display: 'flex', flexDirection: 'column', height: 480}}>
          <PeoplePicker selected={picked} onChange={setPicked} exclude={conversation.members.map(m => m.id)} suggestions={contacts} autoFocus label="Add:" />
          {err && <div style={{color: 'var(--fb-red)', fontSize: 13, padding: '0 16px'}}>{err}</div>}
          <div className={styles.newActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={busy || picked.length === 0}
              onClick={() =>
                void run(async () => {
                  const d = await chatApi.addMembers(conversation.id, picked.map(p => p.id));
                  onUpdated(d.conversation);
                })
              }>
              Add people
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={dialog === 'leave'} onClose={() => setDialog(null)} title="Leave group chat?" width={548}>
        <div className={styles.dialogBody}>
          <div className={styles.dialogText}>You will stop receiving messages from this conversation and people will see that you left.</div>
          {err && <div style={{color: 'var(--fb-red)', fontSize: 13}}>{err}</div>}
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await chatApi.leave(conversation.id);
                  onLeft();
                })
              }>
              Leave group
            </button>
          </div>
        </div>
      </Dialog>
    </aside>
  );
}
