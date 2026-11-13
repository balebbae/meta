import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL: the Goals panel on /activities. */
export default function GoalsPage() {
  redirect(panelHref({panel: 'goals'}));
}
