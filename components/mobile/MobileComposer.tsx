'use client';
import {Avatar} from '@/components/ui/Avatar';
import {FeedPhotoIcon} from '@/components/icons';
import {COMPOSE_EVENT} from '@/components/layout/ComposeFab';
import type {User} from '@/lib/types';
import styles from './mobile.module.css';

export function MobileComposer({viewer}: {viewer: Pick<User, 'id' | 'name' | 'avatarUrl'>}) {
  const open = () => window.dispatchEvent(new Event(COMPOSE_EVENT));
  return (
    <div className={`${styles.mobileOnly} ${styles.composer}`}>
      <Avatar src={viewer.avatarUrl} alt={viewer.name} size={40} />
      <button className={styles.composerText} onClick={open}>
        What&apos;s on your mind?
      </button>
      <button className={styles.composerPhoto} aria-label="Photo" onClick={open}>
        <FeedPhotoIcon size={24} />
      </button>
    </div>
  );
}
