import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL (pushes already sent): that conversation in the Mentors panel. */
export default async function MentorRequestRoute({params}: {params: Promise<{requestId: string}>}) {
  redirect(panelHref({panel: 'mentors', request: (await params).requestId}));
}
