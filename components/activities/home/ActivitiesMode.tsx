'use client';

import {useActivitiesMode} from './useActivitiesMode';

/** Mounted once by the signed-in layout: switches Activities mode on and off with the route. Renders nothing;
 *  the canvas under the app is one solid colour (layout.module.css). */
export function ActivitiesMode() {
  useActivitiesMode();
  return null;
}
