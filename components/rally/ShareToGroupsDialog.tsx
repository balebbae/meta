'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import s from './dashboard.module.css';

type Target = {id: number; name: string; iconUrl: string; privacy: 'public' | 'private'; memberCount: number; posted: boolean; score: number};

/** Post a quest into the viewer's groups as a sign-up post with a spot limit. Relevant groups come preselected. */
export function ShareToGroupsDialog({questId, open, onClose}: {questId: number; open: boolean; onClose: () => void}) {
  const [groups, setGroups] = useState<Target[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [spots, setSpots] = useState(10);
  const [going, setGoing] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<Target[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setPosted(null);
    setError(null);
    fetch(`/api/quests/${questId}/share`, {cache: 'no-store'})
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d: {groups: Target[]; capacity: number | null; going: number}) => {
        setGroups(d.groups);
        setPicked(new Set(d.groups.filter(g => g.score > 0 && !g.posted).map(g => g.id)));
        setGoing(d.going);
        setSpots(Math.max(d.capacity ?? 10, d.going, 2));
      })
      .catch(() => setError('Could not load your groups.'));
  }, [open, questId]);

  const toggle = (id: number) => setPicked(p => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quests/${questId}/share`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({groupIds: [...picked], spots, note})});
    const d = (await res.json().catch(() => ({}))) as {posted?: number[]; error?: string};
    setBusy(false);
    if (!res.ok) return setError(d.error ?? 'Could not post.');
    setPosted((groups ?? []).filter(g => d.posted?.includes(g.id)));
  }

  const suggested = (groups ?? []).filter(g => g.score > 0);
  const others = (groups ?? []).filter(g => g.score === 0);
  const row = (g: Target) => (
    <label key={g.id} className={s.shareRow}>
      <input type="checkbox" checked={picked.has(g.id)} disabled={g.posted} onChange={() => toggle(g.id)} />
      <Avatar src={g.iconUrl} alt="" size={36} />
      <span className={s.shareName}>
        <strong>{g.name}</strong>
        <span className={s.muted}>{g.posted ? 'Already posted' : `${g.privacy === 'private' ? 'Private' : 'Public'} · ${g.memberCount} members`}</span>
      </span>
    </label>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Post to groups">
      {posted ? (
        <div className={s.shareBody}>
          <p>{posted.length ? `Posted to ${posted.map(g => g.name).join(', ')}. Members can join until all ${spots} spots are taken.` : 'Nothing new to post: it is already in those groups.'}</p>
          <div className={s.shareActions}>
            {posted[0] && (
              <Link href={`/groups/${posted[0].id}`} className="fb-btn-primary">
                View post
              </Link>
            )}
            <button type="button" className="fb-btn-secondary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className={s.shareBody}>
          <p className={s.muted}>Group members can sign up until the spots run out. Joining adds them to this quest and its chat.</p>
          {!groups && !error && <p className={s.muted}>Loading your groups…</p>}
          {groups?.length === 0 && <p className={s.muted}>You are not in any groups yet.</p>}
          {suggested.length > 0 && <div className={s.shareHead}>Suggested for this activity</div>}
          {suggested.map(row)}
          {others.length > 0 && <div className={s.shareHead}>{suggested.length ? 'Your other groups' : 'Your groups'}</div>}
          {others.map(row)}
          <label className={s.shareField}>
            Spots (including the {going} already in)
            <input type="number" min={Math.max(2, going)} max={100} value={spots} onChange={e => setSpots(Number(e.target.value))} />
          </label>
          <label className={s.shareField}>
            Add a note (optional)
            <textarea rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Saturday 8am at the Katy Trail. All paces welcome." />
          </label>
          {error && (
            <p className={s.shareError} role="alert">
              {error}
            </p>
          )}
          <div className={s.shareActions}>
            <button type="button" className="fb-btn-primary" disabled={busy || picked.size === 0 || spots < Math.max(2, going) || spots > 100} onClick={submit}>
              {busy ? 'Posting…' : picked.size > 1 ? `Post to ${picked.size} groups` : 'Post'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
