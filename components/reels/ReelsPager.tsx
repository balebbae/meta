'use client';

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Reel} from '@/lib/reels';
import ReelsViewer from './ReelsViewer';
import styles from './reels.module.css';

type Feed = {reels: Reel[]; nextAfter: number | null};
const PAGES = [
  {id: 'feed', label: 'Reels'},
  {id: 'fitness', label: 'Fitness'},
] as const;

/**
 * /reels: general Reels on the left, the fitness library on the right. Native horizontal scroll-snap does
 * the swipe (touch, trackpad), so each feed keeps its own vertical snap scrolling; the tabs and
 * ←/→ keys move between pages. A transform-based slider would break the viewers' position:fixed toasts.
 */
export default function ReelsPager({feed, fitness, initialPage, initialTag}: {feed: Feed; fitness: Feed; initialPage: 0 | 1; initialTag?: string}) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<0 | 1>(initialPage);
  const [hint, setHint] = useState(initialPage === 0);

  // Start on the requested page without an animated scroll.
  useLayoutEffect(() => {
    const el = pagerRef.current;
    if (el) el.scrollLeft = initialPage * el.clientWidth;
  }, [initialPage]);

  const go = useCallback((p: 0 | 1) => {
    const el = pagerRef.current;
    el?.scrollTo({left: p * el.clientWidth, behavior: 'smooth'});
  }, []);

  const onScroll = () => {
    const el = pagerRef.current;
    if (!el || !el.clientWidth) return;
    const p = (Math.round(el.scrollLeft / el.clientWidth) ? 1 : 0) as 0 | 1;
    if (p === page) return;
    setPage(p);
    setHint(false);
    // Keep the page in the URL so refresh and shared links land on the same tab.
    const url = new URL(window.location.href);
    if (p === 1) url.searchParams.set('tab', 'fitness');
    else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url);
  };

  // Keep the current page aligned when the window is resized.
  useEffect(() => {
    const onResize = () => {
      const el = pagerRef.current;
      if (el) el.scrollLeft = page * el.clientWidth;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight' && page === 0) go(1);
      if (e.key === 'ArrowLeft' && page === 1) go(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, go]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(t);
  }, [hint]);

  return (
    <div className={styles.pagerWrap}>
      <div className={styles.pagerTabs} role="tablist" aria-label="Reels feeds">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`reels-tab-${p.id}`}
            aria-selected={page === i}
            aria-controls={`reels-page-${p.id}`}
            className={`${styles.pagerTab} ${page === i ? styles.pagerTabOn : ''}`}
            onClick={() => go(i as 0 | 1)}>
            {p.label}
          </button>
        ))}
      </div>
      {hint && (
        <button type="button" className={styles.swipeHint} onClick={() => go(1)}>
          Swipe left for Fitness
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}
      <div className={styles.pager} ref={pagerRef} onScroll={onScroll}>
        <div className={styles.pagerPage} id="reels-page-feed" role="tabpanel" aria-labelledby="reels-tab-feed">
          <ReelsViewer initialReels={feed.reels} nextAfter={feed.nextAfter} variant="feed" visible={page === 0} showTitle={false} />
        </div>
        <div className={styles.pagerPage} id="reels-page-fitness" role="tabpanel" aria-labelledby="reels-tab-fitness">
          <ReelsViewer initialReels={fitness.reels} nextAfter={fitness.nextAfter} initialTag={initialTag} variant="fitness" visible={page === 1} showTitle={false} />
        </div>
      </div>
    </div>
  );
}
