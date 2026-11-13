import {redirect} from 'next/navigation';
import {panelHref} from '@/lib/activities/panel-href';

/** Old URL (game invites, intro): the onboarding panel on /activities, which keeps the step order rules. */
export default async function OnboardingStepPage({params, searchParams}: {params: Promise<{step: string}>; searchParams: Promise<{invite?: string}>}) {
  const [{step}, q] = await Promise.all([params, searchParams]);
  redirect(panelHref({panel: 'onboarding', step, invite: q.invite}));
}
