'use client';

import {useState} from 'react';
import Image from 'next/image';
import type {Video} from '@/lib/secondary-queries';
import {formatCount, formatDuration, timeAgo} from '@/lib/secondary-data';
import styles from './video.module.css';
import {CommentIcon, GlobeIcon, LikeIcon, LikeOutlineIcon, MoreIcon, PlayIcon, ShareIcon} from './icons';

export function VideoCard({video}: {video: Video}) {
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const likeCount = video.likeCount + (liked ? 1 : 0);
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <Image className={styles.avatar} src={video.channel.avatarUrl} alt="" width={40} height={40} />
        <div className={styles.headText}>
          <div>
            <span className={styles.channel}>{video.channel.name}</span>
            <button type="button" className={styles.follow}>
              Follow
            </button>
          </div>
          <div className={styles.meta}>
            {formatCount(video.viewCount)} views · {timeAgo(video.createdAt)} · <GlobeIcon />
          </div>
        </div>
        <button type="button" className={styles.more} aria-label="More">
          <MoreIcon />
        </button>
      </div>
      <div className={styles.title}>{video.title}</div>
      <div className={styles.thumbWrap} onClick={() => setPlaying(p => !p)} role="button" aria-label={`Play ${video.title}`}>
        <Image className={styles.thumb} src={video.thumbnailUrl} alt="" width={1280} height={720} sizes="700px" />
        <div className={styles.playOverlay} style={playing ? {opacity: 0} : undefined}>
          <span className={styles.playBtn}>
            <PlayIcon size={32} />
          </span>
        </div>
        <span className={styles.duration}>{formatDuration(video.durationSeconds)}</span>
        <div className={styles.progress}>
          <span style={{width: playing ? '18%' : 0, transition: playing ? 'width 20s linear' : undefined}} />
        </div>
      </div>
      <div className={styles.stats}>
        <span className={styles.reactions}>
          <span className={styles.reactionBubble}>
            <LikeIcon size={11} />
          </span>
          {formatCount(likeCount)}
        </span>
        <span>
          {formatCount(video.commentCount)} comments · {formatCount(video.shareCount)} shares
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={liked ? styles.actionActive : styles.action} onClick={() => setLiked(l => !l)}>
          {liked ? <LikeIcon /> : <LikeOutlineIcon />} Like
        </button>
        <button type="button" className={styles.action}>
          <CommentIcon /> Comment
        </button>
        <button type="button" className={styles.action}>
          <ShareIcon /> Share
        </button>
      </div>
    </article>
  );
}
