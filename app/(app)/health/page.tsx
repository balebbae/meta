import {redirect} from 'next/navigation';

/** Health folded into Activities: device sync + readings live under Your Muse → Devices, the level on /activities. */
export default async function HealthPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === 'string')).toString();
  redirect(`/activities/muse${q ? `?${q}` : ''}#devices`);
}
