import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL (Shortcut instructions, older OAuth returns): that source inside the Settings panel, flash params kept. */
export default async function ConnectSourcePage({params, searchParams}: {params: Promise<{source: string}>; searchParams: Promise<{connected?: string; imported?: string; error?: string}>}) {
  const [{source}, q] = await Promise.all([params, searchParams]);
  redirect(panelHref({panel: 'settings', tab: 'sources', source, connected: q.connected, imported: q.imported, error: q.error}));
}
