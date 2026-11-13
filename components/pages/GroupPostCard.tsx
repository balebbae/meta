'use client';
import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import {useState} from 'react';
import type {GroupPost} from '@/lib/secondary-queries';
import {formatCount, timeAgo} from '@/lib/secondary-data';
import {CommentIcon, GlobeIcon, LikeIcon, LikeOutlineIcon, LockIcon, MoreIcon, ShareIcon} from './icons';
import {GroupActivityCard} from './GroupActivityCard';
import {CloseIcon, FeedActionIcon} from '@/components/icons';
import styles from './groups.module.css';

export function GroupPostCard({post, showGroup = true}: {post: GroupPost; showGroup?: boolean}) {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const likes = post.likeCount + (liked ? 1 : 0);
  if (hidden) return null;
  return (
    <article className={styles.post}>
      <header className={styles.postHead}>
        <div className={styles.postIconWrap}>
          {showGroup ? (
            <>
              <Image src={post.group.iconUrl} alt="" width={40} height={40} className={styles.postIcon} />
              <Image src={post.author.avatarUrl} alt="" width={24} height={24} className={styles.postAuthorMini} />
            </>
          ) : (
            <Image src={post.author.avatarUrl} alt="" width={40} height={40} style={{borderRadius: '50%'}} />
          )}
        </div>
        <div className={styles.postTitles}>
          {showGroup ? (
            <>
              <Link href={`/groups/${post.group.id}`} className={styles.postGroup}>
                {post.group.name}
              </Link>
              <div className={styles.postSub}>
                <Link href={`/profile/${post.author.id}`}>{post.author.name}</Link>
                <span>·</span>
                <span>{timeAgo(post.createdAt)}</span>
                <span>·</span>
                {post.group.privacy === 'private' ? <LockIcon size={12} /> : <GlobeIcon size={12} />}
              </div>
            </>
          ) : (
            <>
              <Link href={`/profile/${post.author.id}`} className={styles.postGroup}>
                {post.author.name}
              </Link>
              <div className={styles.postSub}>
                <span>{timeAgo(post.createdAt)}</span>
                <span>·</span>
                {post.group.privacy === 'private' ? <LockIcon size={12} /> : <GlobeIcon size={12} />}
              </div>
            </>
          )}
        </div>
        <button type="button" className={styles.more} aria-label="More">
          <MoreIcon size={20} />
        </button>
        {showGroup && <button className={`${styles.more} ${styles.mobilePostControl}`} aria-label="Hide post" onClick={() => setHidden(true)}><CloseIcon size={20} /></button>}
      </header>
      <div className={`${styles.postBody} ${styles.desktopPostBody}`}>{post.content}</div>
      <div className={`${styles.postBody} ${styles.mobilePostBody}`}>
        {post.content.length > 220 && !expanded ? post.content.slice(0, 220).trimEnd() + '… ' : post.content}
        {post.content.length > 220 && !expanded && <button className={styles.postSeeMore} onClick={() => setExpanded(true)}>See more</button>}
      </div>
      {post.activity && <GroupActivityCard groupId={post.group.id} postId={post.id} activity={post.activity} />}
      {post.imageUrl && (
        <div className={styles.postImage}>
          <Image src={post.imageUrl} alt="" fill sizes="680px" />
        </div>
      )}
      <div className={styles.counts}>
        <span className={styles.countsLeft}>
          <span className={styles.likeBadge}>
            <LikeIcon size={10} />
          </span>
          {formatCount(likes)}
        </span>
        <span>{post.commentCount} comments</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={liked ? styles.actionActive : styles.action} aria-label="Like" aria-pressed={liked} onClick={() => setLiked(v => !v)}>
          <span className={styles.desktopGroupLabel}>{liked ? <LikeIcon size={18} /> : <LikeOutlineIcon size={18} />}</span>
          <span className={styles.mobileGroupLabel}><FeedActionIcon name="like" size={22} /></span>
          <span className={styles.actionLabel}>Like</span><span className={styles.mobileGroupLabel}>{formatCount(likes)}</span>
        </button>
        <button type="button" className={styles.action} aria-label="Comment">
          <span className={styles.desktopGroupLabel}><CommentIcon size={18} /></span>
          <span className={styles.mobileGroupLabel}><FeedActionIcon name="comment" size={22} /></span>
          <span className={styles.actionLabel}>Comment</span><span className={styles.mobileGroupLabel}>{formatCount(post.commentCount)}</span>
        </button>
        <button type="button" className={styles.action} aria-label="Share">
          <span className={styles.desktopGroupLabel}><ShareIcon size={18} /></span>
          <span className={styles.mobileGroupLabel}><FeedActionIcon name="share" size={22} /></span>
          <span className={styles.actionLabel}>Share</span>
        </button>
        <span className={styles.mobileReaction} aria-hidden="true"><LikeIcon size={16} /></span>
      </div>
    </article>
  );
}
