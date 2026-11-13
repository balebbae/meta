import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL (pushes and notifications already sent point here). */
export default async function OldMentorRequestRoute({params}: {params: Promise<{requestId: string}>}) {
  redirect(panelHref({panel: 'mentors', request: (await params).requestId}));
}
