'use client';
import {useMemo} from 'react';
import {castHero} from '@/lib/kingdom/cast';
import {useSprite} from '@/components/kingdom/sprite';
import styles from './avatar.module.css';

export type AvatarState = 'idle' | 'run' | 'attack' | 'celebrate';

/**
 * A player's Kingdom hero: looks are fixed by their name, rank (Page to Royal Champion) by the gear they have earned.
 * The profile photo rides along as a small chip so people stay recognisable.
 */
export function RallyAvatar({src, name, gear = [], state = 'idle', size = 96, mvp = false, className}: {src: string; name: string; gear?: string[]; state?: AvatarState; size?: number; mvp?: boolean; className?: string}) {
  const cast = useMemo(() => castHero(name, gear), [name, gear.length]); // eslint-disable-line react-hooks/exhaustive-deps -- rank only depends on the gear count
  const url = useSprite(cast, state);
  const failed = url === 'error';
  const chip = Math.round(size * 0.36);
  return (
    <span className={`${styles.avatar} ${styles[state]} ${className ?? ''}`} style={{width: size, height: size}} role="img" aria-label={`${name}'s hero${state !== 'idle' ? `, ${state}` : ''}${mvp ? ', MVP' : ''}`}>
      <span className={styles.shadow} />
      {/* eslint-disable @next/next/no-img-element -- data URLs: a rendered sprite and base64 profile photos */}
      {url && !failed ? <img className={styles.sprite} src={url} alt="" draggable={false} /> : failed && src ? <img className={styles.photoOnly} src={src} alt="" /> : <span className={styles.pending} />}
      {src && !failed && size >= 44 && <img className={styles.chip} src={src} alt="" style={{width: chip, height: chip}} />}
      {/* eslint-enable @next/next/no-img-element */}
      {mvp && <span className={styles.badge} style={{fontSize: Math.max(10, size * 0.22)}} aria-hidden>★</span>}
    </span>
  );
}
