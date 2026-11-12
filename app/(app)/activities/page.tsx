import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getDiscover} from '@/lib/activities/discover';
import {interestSuggestions} from '@/lib/activities/interests';
import {allowedSurfaces} from '@/lib/activities/prompts';
import {DiscoverPage} from '@/components/activities/DiscoverPage';
import {OnboardingGate} from '@/components/activities/OnboardingGate';

export const dynamic = 'force-dynamic';

/** /activities — Discover (§9): the Activities landing page. */
export default async function ActivitiesPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const params = await searchParams;
  const [data, interests, prompts] = await Promise.all([getDiscover(user.id), interestSuggestions(user.id), allowedSurfaces(user.id, ['discover_interests'])]);
  // The intro modal (§8) is owned by OnboardingGate; DiscoverPage's built-in intro stays off.
  return (
    <>
      <OnboardingGate userId={user.id} searchParams={params} />
      <DiscoverPage viewer={{id: user.id, name: user.name, avatarUrl: user.avatarUrl}} data={data} interests={interests} showIntro={false} showInterests={prompts.discover_interests} start={params.start ?? null} eventId={params.event ? Number(params.event) : null} />
    </>
  );
}
