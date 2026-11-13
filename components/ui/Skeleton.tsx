import type {CSSProperties} from 'react';
import styles from './skeleton.module.css';

type Variant = 'feed' | 'panel' | 'profile' | 'messenger' | 'list' | 'grid';

/** A single shimmering block. Sizes are passed as style so callers can shape it without new classes. */
export function Skeleton({w, h, r = 6, style, className}: {w?: number | string; h?: number | string; r?: number | string; style?: CSSProperties; className?: string}) {
  return <span className={`${styles.block} ${className ?? ''}`} style={{width: w, height: h, borderRadius: r, ...style}} aria-hidden="true" />;
}

function Row({avatar = 36, lines = 2}: {avatar?: number; lines?: number}) {
  return (
    <div className={styles.row}>
      <Skeleton w={avatar} h={avatar} r="50%" />
      <div className={styles.lines}>
        <Skeleton w="55%" h={12} />
        {lines > 1 && <Skeleton w="35%" h={10} />}
      </div>
    </div>
  );
}

function PostCardSkeleton({media = 240}: {media?: number}) {
  return (
    <div className={styles.card}>
      <Row avatar={40} />
      <div className={styles.text}>
        <Skeleton w="92%" h={12} />
        <Skeleton w="70%" h={12} />
      </div>
      <Skeleton w="100%" h={media} r={0} className={styles.media} />
      <div className={styles.actions}>
        <Skeleton w={72} h={14} />
        <Skeleton w={72} h={14} />
        <Skeleton w={72} h={14} />
      </div>
    </div>
  );
}

function Panel({rows = 8, title = true}: {rows?: number; title?: boolean}) {
  return (
    <aside className={styles.panel}>
      {title && <Skeleton w={160} h={26} className={styles.panelTitle} />}
      <Skeleton w="100%" h={40} r={20} className={styles.search} />
      {Array.from({length: rows}, (_, i) => (
        <Row key={i} lines={1} />
      ))}
    </aside>
  );
}

function Tile() {
  return (
    <div className={styles.tile}>
      <Skeleton w="100%" h={150} r={8} />
      <Skeleton w="60%" h={12} />
      <Skeleton w="40%" h={10} />
    </div>
  );
}

/** Route-level loading UI shaped like the page it stands in for (used by every app/(app)/**\/loading.tsx). */
export function PageSkeleton({variant}: {variant: Variant}) {
  if (variant === 'feed') {
    return (
      <div className={styles.feed} role="status" aria-label="Loading">
        <div className={styles.composer}>
          <Skeleton w={40} h={40} r="50%" />
          <Skeleton w="100%" h={40} r={20} />
        </div>
        <div className={styles.stories}>
          {Array.from({length: 5}, (_, i) => (
            <Skeleton key={i} w={112} h={200} r={10} />
          ))}
        </div>
        <PostCardSkeleton />
        <PostCardSkeleton media={160} />
      </div>
    );
  }
  if (variant === 'profile') {
    return (
      <div data-layout="wide" className={styles.profile} role="status" aria-label="Loading">
        <Skeleton w="100%" h={350} r={0} className={styles.cover} />
        <div className={styles.profileHead}>
          <Skeleton w={168} h={168} r="50%" className={styles.profileAvatar} />
          <div className={styles.lines}>
            <Skeleton w={240} h={28} />
            <Skeleton w={120} h={14} />
          </div>
        </div>
        <div className={styles.feedNarrow}>
          <PostCardSkeleton media={200} />
        </div>
      </div>
    );
  }
  if (variant === 'messenger') {
    return (
      <div data-layout="full" className={styles.messenger} role="status" aria-label="Loading">
        <Panel rows={10} />
        <div className={styles.thread}>
          <Row avatar={40} />
          <div className={styles.bubbles}>
            {[180, 260, 120, 300, 200, 90].map((w, i) => (
              <Skeleton key={i} w={w} h={36} r={18} style={{alignSelf: i % 2 ? 'flex-end' : 'flex-start'}} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (variant === 'list') {
    return (
      <div data-layout="wide" className={styles.listPage} role="status" aria-label="Loading">
        <div className={styles.listCard}>
          <Skeleton w={180} h={26} />
          {Array.from({length: 8}, (_, i) => (
            <Row key={i} avatar={56} />
          ))}
        </div>
      </div>
    );
  }
  // 'panel' and 'grid': SecondaryLayout shape — left panel + content
  return (
    <div data-layout="wide" className={styles.wide} role="status" aria-label="Loading">
      <Panel />
      <section className={styles.content}>
        <Skeleton w={200} h={22} />
        {variant === 'grid' ? (
          <div className={styles.grid}>
            {Array.from({length: 8}, (_, i) => (
              <Tile key={i} />
            ))}
          </div>
        ) : (
          <>
            <PostCardSkeleton media={200} />
            <PostCardSkeleton media={140} />
          </>
        )}
      </section>
    </div>
  );
}
