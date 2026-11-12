import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getDiscover} from '@/lib/activities/discover';
import {interestSuggestions} from '@/lib/activities/interests';
import {shouldShowIntro} from '@/lib/activities/onboarding';
import {allowedSurfaces} from '@/lib/activities/prompts';
import {DiscoverPage} from '@/components/activities/DiscoverPage';

export const dynamic = 'force-dynamic';

/** /activities — Discover (§9): the Activities landing page. */
export default async function ActivitiesPage({searchParams}: {searchParams: Promise<{start?: string; event?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const params = await searchParams;
  const [data, interests, intro, prompts] = await Promise.all([getDiscover(user.id), interestSuggestions(user.id), shouldShowIntro(user.id).catch(() => false), allowedSurfaces(user.id, ['discover_interests', 'intro'])]);
  return <DiscoverPage viewer={{id: user.id, name: user.name, avatarUrl: user.avatarUrl}} data={data} interests={interests} showIntro={intro && prompts.intro} showInterests={prompts.discover_interests} start={params.start ?? null} eventId={params.event ? Number(params.event) : null} />;
}
