'use client';

import {usePathname} from 'next/navigation';
import {useEffect} from 'react';
import {inActivities} from '@/lib/activities/mode';
import {fadeTheme} from './useActTheme';

/** Activities as a mode: sets `html[data-mode='activities']` while an Activities route is mounted and removes it on
 *  leave, fading both ways (~420 ms, see fadeTheme). The chrome re-tints under the attribute in layout.module.css and
 *  mobile.module.css. Call it once: ActivitiesMode does, from the signed-in layout. */
export function useActivitiesMode(): boolean {
  const on = inActivities(usePathname());
  useEffect(() => {
    if (!on) return;
    const html = document.documentElement;
    // a hard load already has the attribute from the head script: nothing to fade from
    if (html.dataset.mode !== 'activities') fadeTheme();
    html.dataset.mode = 'activities';
    return () => {
      fadeTheme();
      delete html.dataset.mode;
    };
  }, [on]);
  return on;
}
