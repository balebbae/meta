'use client';

import styles from '@/components/layout/layout.module.css';
import {Contours} from './Contours';
import {useActivitiesMode} from './useActivitiesMode';

/** Mounted once by the signed-in layout. Switches Activities mode on and off with the route and, while it is on,
 *  lays a faint contour field under the whole app (the hero and the quest cards carry the stronger one). */
export function ActivitiesMode() {
  return useActivitiesMode() ? <Contours className={styles.actBackdrop} strength={0.06} hot={false} dpr={1} /> : null;
}
