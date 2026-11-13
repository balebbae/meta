'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {PlusIcon} from '@/components/icons';
import {profileApi} from '@/components/profile/api';
import type {FriendSummary} from '@/lib/profile-queries';
import type {Story, User} from '@/lib/types';
import {CreateStoryDialog, StoryViewer} from '@/components/feed/StoryDialogs';
import styles from './mobile.module.css';

function MusicNoteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V7h6v5.3A3.5 3.5 0 1 0 19 15.5V3H9z" />
    </svg>
  );
}

export function MobileStories({viewer, requests, stories}: {viewer: Pick<User, 'id' | 'name' | 'avatarUrl'>; requests: FriendSummary[]; stories: Story[]}) {
  const [reqs, setReqs] = useState(requests);
  const [done, setDone] = useState<Record<number, 'confirmed' | 'deleted'>>({});
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const confirm = async (id: number) => {
    setDone(d => ({...d, [id]: 'confirmed'}));
    await profileApi.accept(id).catch(() => {});
  };
  const dismiss = async (id: number) => {
    setReqs(r => r.filter(x => x.id !== id));
    await profileApi.remove(id).catch(() => {});
  };
  return (
    <section className={`${styles.mobileBlock} ${styles.stories}`} aria-label="Stories">
      <div className={styles.storiesTrack}>
        <Link href="/video" className={`${styles.storyCard} ${styles.musicCard}`}>
          <span className={styles.musicNote}>
            <MusicNoteIcon />
          </span>
          <span className={styles.musicLabel}>Music</span>
        </Link>
        <button className={styles.storyCard} aria-label="Create story" onClick={() => setCreating(true)}>
          <img className={styles.createImg} src={viewer.avatarUrl} alt="" />
          <span className={styles.createBottom}>
            <span className={styles.createPlus}>
              <PlusIcon size={18} />
            </span>
            Create story
          </span>
        </button>
        {reqs.map(r => (
          <div key={`req-${r.id}`} className={`${styles.storyCard} ${styles.requestCard}`}>
            <button className={styles.requestClose} aria-label="Dismiss" onClick={() => dismiss(r.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <Link href={`/profile/${r.id}`} className={styles.requestAvatar}>
              <Avatar src={r.avatarUrl} alt={r.name} size={56} />
            </Link>
            <span className={styles.requestName}>{r.name}</span>
            <span className={styles.requestSub}>{done[r.id] === 'confirmed' ? 'Friends' : 'Friend request'}</span>
            {done[r.id] !== 'confirmed' && (
              <button className={styles.requestConfirm} onClick={() => confirm(r.id)}>
                Confirm
              </button>
            )}
          </div>
        ))}
        {stories.map((s, i) => (
          <button key={s.id} type="button" className={styles.storyCard} aria-label={`${s.user.name}'s story`} onClick={() => setViewing(i)}>
            <img className={styles.storyImg} src={s.imageUrl} alt="" />
            <span className={styles.storyRing}>
              <Avatar src={s.user.avatarUrl} alt="" size={34} />
            </span>
            <span className={styles.storyName}>{s.user.id === viewer.id ? 'Your story' : s.user.name}</span>
          </button>
        ))}
      </div>
      <CreateStoryDialog open={creating} onClose={() => setCreating(false)} />
      <StoryViewer stories={stories} index={viewing} onClose={() => setViewing(null)} onIndex={setViewing} />
    </section>
  );
}
