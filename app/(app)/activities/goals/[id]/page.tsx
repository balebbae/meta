import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL: that goal's roadmap in the Goals panel. */
export default async function GoalPage({params}: {params: Promise<{id: string}>}) {
  redirect(panelHref({panel: 'goals', goal: (await params).id}));
}
