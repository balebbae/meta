'use client';
import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {Dialog} from '@/components/ui/Dialog';
import styles from './groups.module.css';

export function CreateGroupDialog({open, onClose}: {open: boolean; onClose: () => void}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({name: name.trim(), privacy, description: description.trim() || null}),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong');
      return;
    }
    const {group} = await res.json();
    onClose();
    router.push(`/groups/${group.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create group" width={500}>
      <form className={styles.form} onSubmit={submit}>
        <input placeholder="Group name" value={name} onChange={e => setName(e.target.value)} required maxLength={75} />
        <select value={privacy} onChange={e => setPrivacy(e.target.value as 'public' | 'private')} aria-label="Choose privacy">
          <option value="public">Public · Anyone can see who&apos;s in the group and what they post</option>
          <option value="private">Private · Only members can see who&apos;s in the group and what they post</option>
        </select>
        <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit" className={styles.submit} disabled={!name.trim() || busy}>
          {busy ? 'Creating…' : 'Create'}
        </button>
      </form>
    </Dialog>
  );
}
