import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getDiscover} from '@/lib/activities/discover';
import {interestSuggestions} from '@/lib/activities/interests';
import {allowedSurfaces} from '@/lib/activities/prompts';
import {listActions} from '@/lib/activities/actions';
import {DiscoverPage} from '@/components/activities/DiscoverPage';
import {listGoals} from '@/lib/activities/goals';
import {OnboardingGate} from '@/components/activities/OnboardingGate';

export const dynamic = 'force-dynamic';

/** /activities — Discover (§9): the Activities landing page. */
export default async function ActivitiesPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const params = await searchParams;
  // Goals are optional here: if the table isn't migrated yet Discover still renders without the spotlight.
  const [data, interests, prompts, museActions, goals] = await Promise.all([getDiscover(user.id), interestSuggestions(user.id), allowedSurfaces(user.id, ['discover_interests']), listActions(user.id), listGoals(user.id).catch(() => [])]);
  // The intro modal (§8) is owned by OnboardingGate; DiscoverPage's built-in intro stays off.
  return (
    <>
      <OnboardingGate userId={user.id} searchParams={params} />
      <DiscoverPage viewer={{id: user.id, name: user.name, avatarUrl: user.avatarUrl}} data={data} museActions={museActions} interests={interests} showIntro={false} showInterests={prompts.discover_interests} start={params.start ?? null} eventId={params.event ? Number(params.event) : null} goal={goals.find(x => x.status === 'active') ?? null} />
    </>
  );
}
