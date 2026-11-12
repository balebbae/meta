'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import type {SavedItem} from '@/lib/secondary-queries';
import {timeAgoLong} from '@/lib/secondary-data';
import {BookmarkIcon, MoreIcon} from './icons';
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
          Post · Saved {timeAgoLong(item.savedAt)} · from
          <Link href={`/profile/${post.author.id}`} className={styles.collection}>
            <Image src={post.author.avatarUrl} alt="" width={16} height={16} />
            {post.author.name}
          </Link>
        </div>
        <div className={styles.collection} style={{marginTop: 4}}>
          <BookmarkIcon size={14} />
          {item.collection}
        </div>
        <div className={styles.itemFooter}>
          <button type="button" className={styles.btn} style={{flex: 1, justifyContent: 'center'}}>
            Add to collection
          </button>
          <button type="button" className={styles.btn} onClick={unsave} aria-label="Unsave">
            <MoreIcon size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
