'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Composer} from '@/components/feed/Composer';
import {CreateStoryCard} from '@/components/feed/CreateStoryCard';
import {PostCard} from '@/components/feed/PostCard';
import {PostSkeleton} from '@/components/feed/PostSkeleton';
import {MobileComposer} from '@/components/mobile/MobileComposer';
import {MobileStories} from '@/components/mobile/MobileStories';
import type {FriendSummary} from '@/lib/profile-queries';
import type {Post, Story, User} from '@/lib/types';
import styles from './feed.module.css';

export function Feed({
  viewer,
  initialPosts,
  initialCursor,
  stories = [],
  requests = [],
}: {
  viewer: User;
  initialPosts: Post[];
  initialCursor: string | null;
  stories?: Story[];
  requests?: FriendSummary[];
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?cursor=${encodeURIComponent(cursor)}&limit=10`);
      if (!res.ok) throw new Error();
      const d = (await res.json()) as {posts: Post[]; nextCursor: string | null};
      setPosts(p => {
        const seen = new Set(p.map(x => x.id));
        return [...p, ...d.posts.filter(x => !seen.has(x.id))];
      });
      setCursor(d.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(entries => entries[0].isIntersecting && loadMore(), {rootMargin: '600px 0px'});
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, cursor]);

  return (
    <>
      <Composer viewer={viewer} onCreated={p => setPosts(list => [p, ...list])} />
      <CreateStoryCard />
      <MobileComposer viewer={viewer} />
      <MobileStories viewer={viewer} requests={requests} stories={stories} />
      {posts.map(p => (
        <PostCard key={p.id} post={p} viewer={viewer} />
      ))}
      {(loading || cursor) && (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}
      <div ref={sentinel} className={styles.sentinel} />
      {!cursor && !loading && <p className={styles.endOfFeed}>You&apos;re all caught up.</p>}
    </>
  );
}
