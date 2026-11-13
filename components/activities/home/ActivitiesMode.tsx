'use client';

import {useActivitiesMode} from './useActivitiesMode';

/** Mounted once by the signed-in layout. Switches Activities mode on and off with the route; renders nothing. */
export function ActivitiesMode() {
  useActivitiesMode();
  return null;
}
