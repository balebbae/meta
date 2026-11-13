import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL (notifications, Discover cards): the Mentors panel on /activities. */
export default async function MentorRoute({searchParams}: {searchParams: Promise<{offer?: string}>}) {
  redirect(panelHref({panel: 'mentors', offer: (await searchParams).offer}));
}
