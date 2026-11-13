'use client';
import {useMemo} from 'react';
import {castBoss} from '@/lib/kingdom/cast';
import {useSprite} from '@/components/kingdom/sprite';
import styles from './boss.module.css';

/** A quest boss: always one of the Kingdom creatures in its boss variant, picked from the quest's boss kind. */
export function BossArt({kind, name, size = 160, hurt = false, down = false}: {kind: string; name: string; size?: number; hurt?: boolean; down?: boolean}) {
  const cast = useMemo(() => castBoss(kind), [kind]);
  const url = useSprite(cast);
  return (
    <span className={`${styles.boss} ${hurt ? styles.hurt : ''} ${down ? styles.down : ''}`} style={{width: size, height: size}} role="img" aria-label={`${name}${down ? ', defeated' : ''}`}>
      <span className={styles.shadow} />
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered sprite data URL */}
      {url && url !== 'error' ? <img className={styles.sprite} src={url} alt="" draggable={false} /> : <span className={styles.pending} />}
    </span>
  );
}
