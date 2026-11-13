import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getDiscover, getUserTags} from '@/lib/activities/discover';
import {listActions} from '@/lib/activities/actions';
import {listingsForTags, listQuestsForUser} from '@/lib/rally/queries';
import {listActiveGamesForUser} from '@/lib/turf/store';
import {listOpenMirrors} from '@/lib/rally/mirror-store';
import {listOpenSwims} from '@/lib/rally/swim-store';
import {mirrorTitle} from '@/lib/rally/mirror';
import {listListings} from '@/lib/secondary-queries';
import {DiscoverPage, type MyGame} from '@/components/activities/DiscoverPage';
import {listGoals} from '@/lib/activities/goals';
import {OnboardingGate} from '@/components/activities/OnboardingGate';
import {setOnboardingStep, shouldShowIntro} from '@/lib/activities/onboarding';
import {panelHref} from '@/lib/activities/panel-href';
import {CoachMode} from '@/components/activities/CoachMode';
import {ActivitiesPanels} from '@/components/activities/panels/ActivitiesPanels';
import {setCoachMode} from '@/lib/activities/coach';
import {fitnessLevel} from '@/lib/activities/level';
import {listVaultEvents} from '@/lib/activities/vault';
import {homeProgress, nearbyEvents} from '@/lib/activities/home';

export const dynamic = 'force-dynamic';

/** /activities — action items, suggested reels, Marketplace gear, leaderboard, then the rest of Discover. */
export default async function ActivitiesPage({searchParams}: {searchParams: Promise<Record<string, string | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const params = await searchParams;
  // First visit goes straight into onboarding; marking it started keeps later visits on Discover.
  if (!params.panel && !params.invite && params.intro !== '1' && (await shouldShowIntro(user.id).catch(() => false))) {
    await setOnboardingStep(user.id, 'character');
    redirect(panelHref({panel: 'onboarding', step: 'character'}));
  }
  // Goals are optional here: if the table isn't migrated yet Discover still renders without the spotlight.
  const [data, museActions, listings, goals, quests, turf, progress, nearby, mirrors, swims] = await Promise.all([
    getDiscover(user.id),
    listActions(user.id),
    // Gear for the user's tags (no tags: 'fitness' + Sporting Goods); nothing matching falls back to newest listings.
    getUserTags(user.id)
      .then(tags => listingsForTags(tags.length ? tags : ['fitness'], 12))
      .then(gear => (gear.length ? gear : listListings(user.id).then(all => all.slice(0, 12))))
      .catch(() => []),
    listGoals(user.id).catch(() => []),
    listQuestsForUser(user.id),
    listActiveGamesForUser(user.id),
    homeProgress(user.id).catch(() => null),
    nearbyEvents(user.id).catch(() => null),
    // Mirror Yoga / Mirror Dance and Castle Crossing live in the chat that started them
    listOpenMirrors(user.id).catch(() => []),
    listOpenSwims(user.id).catch(() => []),
  ]);
  // Coach mode always opens off; only an explicit ?coach=on (Your Muse link, old /activities/coach) opens it on
  const coachOn = params.coach === 'on';
  if (coachOn) await setCoachMode(user.id, true).catch(() => {});
  const recent = await listVaultEvents(user.id, {since: new Date(Date.now() - 28 * 86_400_000).toISOString(), limit: 500}).catch(() => []);
  const level = recent.length ? fitnessLevel(recent) : null;
  const games: MyGame[] = [
    ...quests
      .filter(q => q.status === 'active')
      .map(q => ({key: `q${q.id}`, href: `/activities/games/${q.id}`, title: q.title, subtitle: q.bossHp ? `${q.bossHpLeft} / ${q.bossHp} HP` : `Rally · ${q.template}`, boss: {kind: q.bossKind, name: q.spec.boss?.name ?? q.title}})),
    ...turf.map(g => ({key: `t${g.id}`, href: `/games/${g.id}`, title: g.label, subtitle: g.status === 'live' ? 'Turf · live' : 'Turf · starting soon', boss: null})),
    ...mirrors.map(m => ({key: `m${m.id}`, href: `/messages/${m.conversationId}`, title: mirrorTitle(m.mode), subtitle: m.mine != null ? `Your best ${m.mine} · ${m.played}/${m.members} played` : `${m.played}/${m.members} played`, boss: null, hero: 'idle' as const})),
    ...swims.map(j => ({key: `s${j.id}`, href: `/messages/${j.conversationId}`, title: j.title, subtitle: `${j.route} · ${Math.round((j.progressM / j.totalM) * 100)}%`, boss: null, hero: 'run' as const})),
    // finished quests stay reachable here now that /activities/games redirects to this section
    ...quests.filter(q => q.status === 'completed').map(q => ({key: `q${q.id}`, href: `/activities/games/${q.id}`, title: q.title, subtitle: 'Boss defeated', boss: {kind: q.bossKind, name: q.spec.boss?.name ?? q.title}})),
  ];
  // The intro modal (§8) is owned by OnboardingGate; DiscoverPage's built-in intro stays off.
  return (
    <>
      <OnboardingGate userId={user.id} searchParams={params} />
      <CoachMode initialOn={coachOn}>
        <DiscoverPage viewer={{id: user.id, name: user.name, avatarUrl: user.avatarUrl}} data={data} museActions={museActions} listings={listings} start={params.start ?? null} eventId={params.event ? Number(params.event) : null} goal={goals.find(x => x.status === 'active') ?? null} games={games} level={level} progress={progress} nearby={nearby} />
      </CoachMode>
      <ActivitiesPanels viewerName={user.name} />
    </>
  );
}
