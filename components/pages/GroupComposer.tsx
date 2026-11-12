'use client';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {Avatar} from '@/components/ui/Avatar';
import type {User} from '@/lib/types';
import styles from './groups.module.css';

export function GroupComposer({groupId, user}: {groupId: number; user: User}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/posts`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({content: content.trim()}),
    });
    setBusy(false);
    if (res.ok) {
      setContent('');
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className={styles.composer}>
      <div className={styles.composerRow}>
        <Avatar src={user.avatarUrl} alt={user.name} size={40} />
        <button type="button" className={styles.composerInput} style={{textAlign: 'left', color: 'var(--fb-text-secondary)'}} onClick={() => setOpen(true)}>
          Write something...
        </button>
      </div>
      {open && (
        <form className={styles.composerForm} onSubmit={submit}>
          <textarea autoFocus value={content} onChange={e => setContent(e.target.value)} placeholder="Write something..." />
          <button type="submit" className={styles.btnPrimary} disabled={!content.trim() || busy}>
            Post
          </button>
        </form>
      )}
    </div>
  );
}
