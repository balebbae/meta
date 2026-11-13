'use client';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Dialog} from '@/components/ui/Dialog';
import {MAX_DATA_URL_LENGTH, TOO_BIG_MESSAGE, fileToDataUrlFit} from '@/lib/image-upload';
import {formatCompactTime} from '@/lib/format';
import type {Story} from '@/lib/types';
import styles from './feed.module.css';

/* eslint-disable @next/next/no-img-element */

/** Pick a photo, preview it 9:16, share it as a 24-hour story (POST /api/stories). */
export function CreateStoryDialog({open, onClose}: {open: boolean; onClose: () => void}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setImage(null);
    setError(null);
    onClose();
  };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setImage(await fileToDataUrlFit(file, 1080, MAX_DATA_URL_LENGTH));
    } catch {
      setError(TOO_BIG_MESSAGE);
    }
  };
  const share = async () => {
    if (!image || busy) return;
    setBusy(true);
    const res = await fetch('/api/stories', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({imageUrl: image})});
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as {error?: string};
      setError(d.error ?? 'Could not share your story. Please try again.');
      return;
    }
    close();
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={close} title="Create story" width={520}>
      <div className={styles.storyDlgBody}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => void pick(e.target.files?.[0])} />
        {image ? (
          <div className={styles.storyPreview}>
            <img src={image} alt="Story preview" />
          </div>
        ) : (
          <button type="button" className={styles.storyPick} onClick={() => fileRef.current?.click()}>
            <span className={styles.storyPickIcon} aria-hidden>
              +
            </span>
            Create a photo story
            <small>Shared with friends for 24 hours</small>
          </button>
        )}
        {error && <p className={styles.storyError}>{error}</p>}
        <div className={styles.storyDlgActions}>
          {image && (
            <button type="button" className="fb-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Change photo
            </button>
          )}
          <button type="button" className="fb-btn-primary" onClick={() => void share()} disabled={!image || busy}>
            {busy ? 'Sharing…' : 'Share to story'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** Full-size story viewer with previous/next across the current list. */
export function StoryViewer({stories, index, onClose, onIndex}: {stories: Story[]; index: number | null; onClose: () => void; onIndex: (i: number) => void}) {
  const story = index == null ? null : stories[index];
  if (!story) return null;
  const hasPrev = index! > 0;
  const hasNext = index! < stories.length - 1;
  return (
    <Dialog open onClose={onClose} title={`${story.user.name}'s story`} width={420}>
      <div className={styles.storyViewer}>
        <div className={styles.storyViewerHead}>
          <Avatar src={story.user.avatarUrl} alt="" size={36} />
          <div>
            <div className={styles.storyViewerName}>{story.user.name}</div>
            <div className={styles.storyViewerTime}>{formatCompactTime(story.createdAt)}</div>
          </div>
        </div>
        <img src={story.imageUrl} alt="" className={styles.storyViewerImg} />
        <div className={styles.storyDlgActions} style={{justifyContent: 'space-between'}}>
          <button type="button" className="fb-btn-secondary" onClick={() => onIndex(index! - 1)} disabled={!hasPrev}>
            Previous
          </button>
          <button type="button" className="fb-btn-secondary" onClick={() => onIndex(index! + 1)} disabled={!hasNext}>
            Next
          </button>
        </div>
      </div>
    </Dialog>
  );
}
