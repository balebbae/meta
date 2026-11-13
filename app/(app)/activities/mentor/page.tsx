import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL (pushes and notifications already sent point here). */
export default async function OldMentorRoute({searchParams}: {searchParams: Promise<{offer?: string}>}) {
  redirect(panelHref({panel: 'mentors', offer: (await searchParams).offer}));
}
