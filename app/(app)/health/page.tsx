import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Health folded into Activities: device sync + readings live in Settings → Sources (Devices), the level on /activities. */
export default async function HealthPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === 'string')).toString();
  redirect(`${panelHref({panel: 'settings', tab: 'sources', source: 'apple_health'})}${q ? `&${q}` : ''}`);
}
