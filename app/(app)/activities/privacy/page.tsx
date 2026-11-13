import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL: the Privacy tab of the Settings panel (policies + who asked my Muse what). */
export default function PrivacyPage() {
  redirect(panelHref({panel: 'settings', tab: 'privacy'}));
}
