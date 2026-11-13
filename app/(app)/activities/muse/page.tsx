import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL: what your Muse knows is the Muse tab of the Settings panel; your vault is the Logs panel. */
export default function MusePage() {
  redirect(panelHref({panel: 'settings', tab: 'muse'}));
}
