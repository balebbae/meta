import type {ReactNode} from 'react';
import styles from './cards.module.css';

/** A small progress ring around one member (avatar, hero or rank): `pct` is their share, 0 to 100. */
export function MemberRing({pct, size = 44, color, label, children}: {pct: number; size?: number; color?: string; label: string; children: ReactNode}) {
  return (
    <span className={styles.ring} style={{width: size, height: size}} role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle className={styles.ringTrack} cx="18" cy="18" r="16.5" />
        <circle className={styles.ringBar} cx="18" cy="18" r="16.5" pathLength={100} strokeDasharray={`${Math.max(0, Math.min(100, pct || 0))} 100`} style={color ? {stroke: color} : undefined} />
      </svg>
      {children}
    </span>
  );
}
