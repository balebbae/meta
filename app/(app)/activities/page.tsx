import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getDiscover, getUserTags} from '@/lib/activities/discover';
import {listActions} from '@/lib/activities/actions';
import {listingsForTags} from '@/lib/rally/queries';
import {listListings} from '@/lib/secondary-queries';
import {DiscoverPage} from '@/components/activities/DiscoverPage';
import {listGoals} from '@/lib/activities/goals';
import {OnboardingGate} from '@/components/activities/OnboardingGate';

export const dynamic = 'force-dynamic';

/** /activities — action items, suggested reels, Marketplace gear, leaderboard, then the rest of Discover. */
export default async function ActivitiesPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const params = await searchParams;
  // Goals are optional here: if the table isn't migrated yet Discover still renders without the spotlight.
  const [data, museActions, listings, goals] = await Promise.all([
    getDiscover(user.id),
    listActions(user.id),
    // Gear for the user's tags (no tags: 'fitness' + Sporting Goods); nothing matching falls back to newest listings.
    getUserTags(user.id)
      .then(tags => listingsForTags(tags.length ? tags : ['fitness'], 12))
      .then(gear => (gear.length ? gear : listListings(user.id).then(all => all.slice(0, 12))))
      .catch(() => []),
    listGoals(user.id).catch(() => []),
  ]);
  // The intro modal (§8) is owned by OnboardingGate; DiscoverPage's built-in intro stays off.
  return (
    <>
      <OnboardingGate userId={user.id} searchParams={params} />
      <DiscoverPage viewer={{id: user.id, name: user.name, avatarUrl: user.avatarUrl}} data={data} museActions={museActions} listings={listings} showIntro={false} start={params.start ?? null} eventId={params.event ? Number(params.event) : null} goal={goals.find(x => x.status === 'active') ?? null} />
    </>
  );
}
