import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL: logging lives in the Logs panel on /activities. */
export default async function LogPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const {tab} = await searchParams;
  redirect(panelHref({panel: 'logs', tab}));
}
