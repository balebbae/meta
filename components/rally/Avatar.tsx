'use client';
import {useId} from 'react';
import styles from './avatar.module.css';

export type AvatarState = 'idle' | 'run' | 'attack' | 'celebrate';

/**
 * Original 2D SVG avatar (§17.4): one friendly body shape for everyone, the user's profile photo clipped
 * as the face, gear layers from avatar_gear slugs. Four CSS-animated states. No body-type variation.
 */
export function RallyAvatar({src, name, gear = [], state = 'idle', size = 96, mvp = false, className}: {src: string; name: string; gear?: string[]; state?: AvatarState; size?: number; mvp?: boolean; className?: string}) {
  const id = useId().replace(/:/g, '');
  const has = (s: string) => gear.includes(s);
  const trophies = gear.filter(g => g.startsWith('trophy-')).length;
  return (
    <svg
      viewBox="0 0 100 130"
      width={size}
      height={(size * 130) / 100}
      className={`${styles.avatar} ${styles[state]} ${className ?? ''}`}
      role="img"
      aria-label={`${name}'s avatar${state !== 'idle' ? `, ${state}` : ''}`}>
      <defs>
        <clipPath id={`face-${id}`}>
          <circle cx="50" cy="32" r="22" />
        </clipPath>
      </defs>
      <ellipse className={styles.shadow} cx="50" cy="124" rx="24" ry="4" fill="rgba(0,0,0,0.12)" />
      {has('cape') && (
        <g className={styles.cape}>
          <path d="M30 60 Q22 95 26 118 L74 118 Q78 95 70 60 Z" fill="#D7263D" />
          <path d="M30 60 Q50 70 70 60 L70 66 Q50 76 30 66 Z" fill="#A61B2E" />
        </g>
      )}
      <g className={styles.legs}>
        <g className={styles.legL}>
          <rect x="36" y="92" width="11" height="26" rx="5" fill="#3F4A5B" />
          <ellipse cx="41" cy="118" rx="9" ry="4.5" fill={has('shoes') ? '#FF7A00' : '#1C1E21'} />
        </g>
        <g className={styles.legR}>
          <rect x="53" y="92" width="11" height="26" rx="5" fill="#3F4A5B" />
          <ellipse cx="59" cy="118" rx="9" ry="4.5" fill={has('shoes') ? '#FF7A00' : '#1C1E21'} />
        </g>
      </g>
      <g className={styles.torso}>
        <rect x="30" y="56" width="40" height="42" rx="14" fill={has('rain-jacket') ? '#F2C200' : '#1877F2'} />
        {has('rain-jacket') && <path d="M50 56 L50 98 M38 62 L44 58 M62 62 L56 58" stroke="#B88F00" strokeWidth="2.5" strokeLinecap="round" />}
        <g className={styles.armL}>
          <rect x="18" y="58" width="12" height="30" rx="6" fill={has('rain-jacket') ? '#F2C200' : '#1877F2'} />
          <circle cx="24" cy="90" r="6" fill="#F3C9A8" />
        </g>
        <g className={styles.armR}>
          <rect x="70" y="58" width="12" height="30" rx="6" fill={has('rain-jacket') ? '#F2C200' : '#1877F2'} />
          <circle cx="76" cy="90" r="6" fill="#F3C9A8" />
        </g>
      </g>
      <g className={styles.head}>
        <circle cx="50" cy="32" r="24" fill="#F3C9A8" />
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG image element */}
        <image href={src} x="28" y="10" width="44" height="44" preserveAspectRatio="xMidYMid slice" clipPath={`url(#face-${id})`} />
        <circle cx="50" cy="32" r="22" fill="none" stroke="#fff" strokeWidth="3" />
        {has('headband') && (
          <g>
            <path d="M28 20 Q50 8 72 20 L72 27 Q50 15 28 27 Z" fill="#E41E3F" />
            <path d="M70 22 L84 16 L80 28 Z" fill="#E41E3F" />
          </g>
        )}
      </g>
      {trophies > 0 && (
        <g className={styles.badge}>
          <circle cx="82" cy="50" r="9" fill="#FFD166" stroke="#C99700" strokeWidth="1.5" />
          <text x="82" y="54" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5A4500">
            {trophies}
          </text>
        </g>
      )}
      {mvp && (
        <text x="50" y="128" textAnchor="middle" fontSize="9" fontWeight="700" fill="#C99700" className={styles.mvp}>
          MVP
        </text>
      )}
    </svg>
  );
}
