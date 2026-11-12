'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import type {Reel} from '@/lib/reels';
import {BookmarkIcon, ChevronDownIcon, ChevronUpIcon, CommentIcon, LikeIcon, ShareIcon} from '@/components/icons';
import ChallengeDialog from './ChallengeDialog';
import styles from './reels.module.css';

type Props = {initialReels: Reel[]; nextAfter: number | null; initialTag?: string};
type Toast = {text: string; href?: string; hrefLabel?: string; error?: boolean};

export default function ReelsViewer({initialReels, nextAfter, initialTag}: Props) {
  const [reels, setReels] = useState(initialReels);
  const [after, setAfter] = useState(nextAfter);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [challenge, setChallenge] = useState<Reel | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Which reel is in view: IntersectionObserver over the snap children.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.index));
          }
        }
      },
      {root: feed, threshold: [0.6]},
    );
    feed.querySelectorAll('[data-index]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [reels.length]);

  // Infinite paging near the end.
  useEffect(() => {
    if (after == null || loadingRef.current || active < reels.length - 3) return;
    loadingRef.current = true;
    const qs = new URLSearchParams({after: String(after), limit: '10'});
    if (initialTag) qs.set('tag', initialTag);
    fetch(`/api/reels?${qs}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: {reels: Reel[]; nextAfter: number | null} | null) => {
        if (!data) return;
        setReels(prev => {
          const seen = new Set(prev.map(r => r.id));
          return [...prev, ...data.reels.filter(r => !seen.has(r.id))];
        });
        setAfter(data.nextAfter);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }, [active, after, reels.length, initialTag]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const scrollTo = useCallback((index: number) => {
    const el = feedRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    el?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'j') scrollTo(Math.min(reels.length - 1, active + 1));
      if (e.key === 'ArrowUp' || e.key === 'k') scrollTo(Math.max(0, active - 1));
      if (e.key === 'm') setMuted(m => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, reels.length, scrollTo]);

  if (reels.length === 0) {
    return (
      <div className={styles.stage}>
        <div className={styles.empty}>
          <strong>No Reels yet</strong>
          <span>
            Run <code>node --env-file=.env.local scripts/seed-reels.mjs</code> to seed the demo library.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stage}>
      <div className={styles.feed} ref={feedRef}>
        {reels.map((reel, i) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            index={i}
            isActive={i === active}
            shouldLoad={Math.abs(i - active) <= 1}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            onChallenge={() => setChallenge(reel)}
            onToast={setToast}
          />
        ))}
      </div>
      <div className={styles.arrows}>
        <button type="button" className={styles.arrowBtn} aria-label="Previous reel" disabled={active === 0} onClick={() => scrollTo(active - 1)}>
          <ChevronUpIcon size={24} />
        </button>
        <button
          type="button"
          className={styles.arrowBtn}
          aria-label="Next reel"
          disabled={active >= reels.length - 1}
          onClick={() => scrollTo(active + 1)}
        >
          <ChevronDownIcon size={24} />
        </button>
      </div>
      {challenge && (
        <ChallengeDialog
          reel={challenge}
          onClose={() => setChallenge(null)}
          onSent={(group, conversationId) => {
            setChallenge(null);
            setToast({text: `Quest sent to ${group}`, href: `/messages/${conversationId}`, hrefLabel: 'Open chat'});
          }}
          onError={text => setToast({text, error: true})}
        />
      )}
      {toast && (
        <div className={`${styles.toast} ${toast.error ? styles.toastError : ''}`} role="status">
          <span>{toast.text}</span>
          {toast.href && <Link href={toast.href}>{toast.hrefLabel ?? 'Open'}</Link>}
        </div>
      )}
    </div>
  );
}

function ReelItem({
  reel,
  index,
  isActive,
  shouldLoad,
  muted,
  onToggleMute,
  onChallenge,
  onToast,
}: {
  reel: Reel;
  index: number;
  isActive: boolean;
  shouldLoad: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onChallenge: () => void;
  onToast: (t: Toast) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const countedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && !paused) {
      v.muted = muted;
      const p = v.play();
      if (p) p.catch(() => {});
      if (!countedRef.current) {
        countedRef.current = true;
        fetch(`/api/reels/${reel.id}/play`, {method: 'POST'}).catch(() => {});
      }
    } else {
      v.pause();
      if (!isActive) {
        v.currentTime = 0;
        setPaused(false);
      }
    }
  }, [isActive, paused, muted, reel.id]);

  const onTap = () => {
    if (muted) {
      onToggleMute();
      return;
    }
    setPaused(p => !p);
  };

  const share = async () => {
    const url = `${window.location.origin}/reels?reel=${reel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({title: reel.caption ?? 'Reel', url});
      } else {
        await navigator.clipboard.writeText(url);
        onToast({text: 'Link copied'});
      }
    } catch {
      /* cancelled */
    }
  };

  const portrait = (reel.height ?? 0) > (reel.width ?? 0);
  const poster = reel.posterUrl ?? undefined;
  const initial = (reel.creatorName || 'P').slice(0, 1).toUpperCase();

  return (
    <section className={styles.item} data-index={index} aria-label={reel.caption ?? `Reel ${reel.id}`}>
      <div className={`${styles.frame} ${portrait ? styles.portrait : ''}`}>
        {!portrait && <div className={styles.backdrop} style={{backgroundImage: `url(${poster})`}} aria-hidden />}
        <video
          ref={videoRef}
          className={styles.video}
          src={shouldLoad ? reel.videoUrl : undefined}
          poster={poster}
          loop
          playsInline
          muted={muted}
          preload={shouldLoad ? 'auto' : 'none'}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${styles.poster} ${playing ? styles.posterHidden : ''}`} src={poster} alt="" />
        <button type="button" className={styles.tapLayer} onClick={onTap} aria-label={muted ? 'Unmute' : paused ? 'Play' : 'Pause'} />
        {isActive && paused && (
          <div className={styles.centerBadge}>
            <PlayGlyph />
          </div>
        )}
        <div className={styles.topRow}>
          <span className={styles.topTitle}>Reels</span>
          <button type="button" className={styles.roundBtn} onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <MutedGlyph /> : <SoundGlyph />}
          </button>
        </div>

        <div className={styles.overlay}>
          <div className={styles.creator}>
            <span className={styles.creatorAvatar}>{initial}</span>
            <div>
              <div>{reel.creatorName}</div>
              <div className={styles.credit}>
                <a href={reel.sourceUrl ?? reel.creatorUrl ?? '#'} target="_blank" rel="noreferrer noopener">
                  {reel.attribution}
                </a>
              </div>
            </div>
          </div>
          {reel.caption && <p className={styles.caption}>{reel.caption}</p>}
          {reel.exercises.length > 0 && (
            <div className={styles.chips}>
              {reel.exercises.slice(0, 4).map(ex => (
                <span key={ex.name} className={`${styles.chip} ${styles.chipPrimary}`}>
                  {ex.name}
                  {ex.reps ? ` · ${ex.reps} reps` : ex.seconds ? ` · ${ex.seconds}s` : ''}
                </span>
              ))}
              {reel.difficulty && <span className={styles.chip}>{capitalize(reel.difficulty)}</span>}
            </div>
          )}
          <div className={styles.meta}>
            {reel.tags.slice(0, 5).map(t => (
              <span key={t} className={styles.tag}>
                #{t.replace(/\s+/g, '')}
              </span>
            ))}
            {reel.squads > 0 && <span>Played by {reel.squads === 1 ? '1 squad' : `${reel.squads} squads`}</span>}
            {reel.synthetic && reel.confidence != null && reel.confidence <= 0.5 && <span className={styles.offline}>Muse offline · auto-tagged</span>}
          </div>
        </div>

        <div className={styles.rail}>
          <button type="button" className={styles.railBtn} onClick={() => setLiked(l => !l)} aria-pressed={liked}>
            <span className={`${styles.railIcon} ${liked ? styles.railIconOn : ''}`}>
              <LikeIcon size={24} />
            </span>
            {liked ? 'Liked' : 'Like'}
          </button>
          <button type="button" className={styles.railBtn} onClick={() => onToast({text: 'Comments on Reels are coming soon'})}>
            <span className={styles.railIcon}>
              <CommentIcon size={24} />
            </span>
            Comment
          </button>
          <button type="button" className={styles.railBtn} onClick={share}>
            <span className={styles.railIcon}>
              <ShareIcon size={24} />
            </span>
            Share
          </button>
          <button type="button" className={styles.railBtn} onClick={() => setSaved(s => !s)} aria-pressed={saved}>
            <span className={`${styles.railIcon} ${saved ? styles.railIconOn : ''}`}>
              <BookmarkIcon size={24} />
            </span>
            {saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" className={styles.railBtn} onClick={onChallenge}>
            <span className={`${styles.railIcon} ${styles.railChallenge}`}>
              <SwordsGlyph />
            </span>
            Challenge
            <br />
            the GC
          </button>
        </div>
      </div>
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PlayGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.9-6.86a1.03 1.03 0 0 0 0-1.76L9.56 4.26C8.87 3.84 8 4.34 8 5.14z" />
    </svg>
  );
}
function MutedGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3 2.8-2.8 1.4 1.4L17.9 13l2.8 2.8-1.4 1.4-2.8-2.8-2.8 2.8-1.4-1.4 2.8-2.8-2.8-2.8 1.4-1.4 2.8 2.8z" />
    </svg>
  );
}
function SoundGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z" />
    </svg>
  );
}
function SwordsGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
      <path d="M9.5 6.5 21 3v3l-4.5 4.5" />
      <path d="m5 14 4 4" />
      <path d="m3 21 2-2" />
      <path d="m5 17 2 2" />
    </svg>
  );
}
