import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL: the Sources tab of the Settings panel. */
export default function ConnectIndexPage() {
  redirect(panelHref({panel: 'settings', tab: 'sources'}));
}
