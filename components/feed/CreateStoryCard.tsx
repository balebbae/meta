'use client';
import {useState} from 'react';
import {PlusIcon} from '@/components/icons';
import {CreateStoryDialog} from './StoryDialogs';
import styles from './feed.module.css';

export function CreateStoryCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={styles.storyCard} aria-label="Create story" onClick={() => setOpen(true)}>
        <span className={styles.storyCardPlus}>
          <PlusIcon size={22} />
        </span>
        <span>
          <span className={styles.storyCardTitle}>Create story</span>
          <span className={styles.storyCardSub}>Share a photo, video or write something</span>
        </span>
      </button>
      <CreateStoryDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
