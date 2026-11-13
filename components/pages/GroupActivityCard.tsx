'use client';
import Link from 'next/link';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {CheckIcon} from '@/components/icons';
import type {GroupActivity} from '@/lib/secondary-queries';
import styles from './groups.module.css';

const TEMPLATE: Record<string, string> = {boss: 'Boss fight', relay: 'Relay', streak: 'Streak'};

/** Sign-up card for a Rally quest shared into a group: spots left, who's in, one-tap Join. */
export function GroupActivityCard({groupId, postId, activity}: {groupId: number; postId: number; activity: GroupActivity}) {
  const [a, setA] = useState(activity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ended = a.status !== 'active' || (a.endsAt != null && new Date(a.endsAt) <= new Date());
  const full = a.capacity != null && a.going >= a.capacity;
  const left = a.capacity == null ? null : Math.max(0, a.capacity - a.going);

  async function join() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}/join`, {method: 'POST'});
    const d = (await res.json().catch(() => ({}))) as {going?: number; capacity?: number | null; error?: string};
    setBusy(false);
    if (res.ok) setA(x => ({...x, joined: true, going: d.going ?? x.going + 1, capacity: d.capacity ?? x.capacity}));
    else setError(d.error ?? 'Could not join right now.');
  }

  return (
    <div className={styles.activity} role="group" aria-label={`Activity: ${a.title}`}>
      <div className={styles.activityKicker}>Rally · {TEMPLATE[a.template] ?? a.template}{a.endsAt && !ended ? ` · until ${new Date(a.endsAt).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}` : ''}</div>
      <div className={styles.activityTitle}>{a.title}</div>
      {a.story && <p className={styles.activityStory}>{a.story}</p>}
      {a.capacity != null && (
        <div className={styles.activityMeter} role="progressbar" aria-valuenow={a.going} aria-valuemin={0} aria-valuemax={a.capacity} aria-label="Spots filled">
          <div style={{width: `${Math.min(100, (a.going / a.capacity) * 100)}%`}} />
        </div>
      )}
      <div className={styles.activityFoot}>
        <div className={styles.activityGoing}>
          <span className={styles.activityFaces}>
            {a.avatars.map((src, i) => (
              <Avatar key={i} src={src} alt="" size={24} />
            ))}
          </span>
          <span>
            {a.going}
            {a.capacity != null ? ` of ${a.capacity}` : ''} going{left != null && !ended ? ` · ${left === 0 ? 'Full' : `${left} ${left === 1 ? 'spot' : 'spots'} left`}` : ''}
          </span>
        </div>
        {a.joined ? (
          <Link href={`/activities/games/${a.questId}`} className={styles.btnSecondary}>
            <CheckIcon size={16} /> You&apos;re in · Open
          </Link>
        ) : (
          <button type="button" className={styles.btnPrimary} disabled={busy || ended || full} onClick={join}>
            {ended ? 'Ended' : full ? 'Full' : busy ? 'Joining…' : 'Join'}
          </button>
        )}
      </div>
      {error && (
        <div className={styles.activityError} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
