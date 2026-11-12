'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import type {SavedItem} from '@/lib/secondary-queries';
import {timeAgoLong} from '@/lib/secondary-data';
import {BookmarkIcon, MoreIcon} from './icons';
import {Avatar} from '@/components/ui/Avatar';
import styles from './saved.module.css';

export function SavedItemCard({item}: {item: SavedItem}) {
  const [removed, setRemoved] = useState(false);
  if (removed) return null;
  const {post} = item;
  async function unsave() {
    setRemoved(true);
    const res = await fetch(`/api/posts/${post.id}/save`, {method: 'DELETE'}).catch(() => null);
    if (!res || (!res.ok && res.status !== 404)) setRemoved(false);
  }
  return (
    <article className={styles.item}>
      <div className={styles.thumb}>
        {post.imageUrl ? <Image src={post.imageUrl} alt="" fill sizes="150px" /> : <div className={styles.thumbText}>{post.content}</div>}
      </div>
      <div className={styles.itemBody}>
        <Link href={`/posts/${post.id}`} className={styles.itemTitle}>
          {post.content}
        </Link>
        <div className={styles.itemMeta}>
          Post • {item.collection} • {post.author.name} • Saved {timeAgoLong(item.savedAt)}
        </div>
        <Link href={`/profile/${post.author.id}`} className={styles.collection}>
          <Avatar src={post.author.avatarUrl} alt="" size={16} />
          Saved from <strong>{post.author.name}&apos;s post</strong>
        </Link>
        <div className={styles.itemFooter}>
          <button type="button" className={styles.btn} style={{minWidth: 150, justifyContent: 'center'}}>
            Add to Collection
          </button>
          <button type="button" className={styles.btn} onClick={unsave} aria-label="Unsave">
            <BookmarkIcon size={18} />
          </button>
          <button type="button" className={styles.btn} aria-label="More">
            <MoreIcon size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
