import {headers} from 'next/headers';
import {notFound, redirect} from 'next/navigation';
import {ConnectStep} from '@/components/activities/onboarding/ConnectStep';
import {MuseStep} from '@/components/activities/onboarding/MuseStep';
import {PrivacyStep} from '@/components/activities/onboarding/PrivacyStep';
import {QuestionsStep} from '@/components/activities/onboarding/QuestionsStep';
import {TagsStep} from '@/components/activities/onboarding/TagsStep';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {detectPlatform, listConnectorCards} from '@/lib/activities/connectors';
import {getProfile, ONBOARDING_STEPS, setOnboardingStep, type OnboardingStep} from '@/lib/activities/onboarding';
import {getPolicies} from '@/lib/activities/policies';
import {museSummary} from '@/lib/activities/summary';
import {listTags} from '@/lib/activities/tags';
import {getSessionUser} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OnboardingStepPage({params, searchParams}: {params: Promise<{step: string}>; searchParams: Promise<{invite?: string}>}) {
  const [{step}, q] = await Promise.all([params, searchParams]);
  if (!ONBOARDING_STEPS.includes(step as OnboardingStep)) notFound();
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const invite = Number(q.invite) > 0 ? Number(q.invite) : null;
  const profile = await getProfile(user.id);
  if (profile.onboardingStep === 'intro' || profile.onboardingStep === 'done' || profile.onboardingStep !== step) await setOnboardingStep(user.id, step as OnboardingStep);

  switch (step as OnboardingStep) {
    case 'tags':
      return <TagsStep initial={await listTags(user.id)} invite={invite} />;
    case 'questions':
      return <QuestionsStep profile={profile} invite={invite} />;
    case 'connect': {
      const platform = detectPlatform((await headers()).get('user-agent'));
      const connections = (await listConnections(user.id)).map(publicConnection);
      return <ConnectStep platform={platform} cards={listConnectorCards(platform)} connections={connections} invite={invite} />;
    }
    case 'privacy':
      return <PrivacyStep policies={await getPolicies(user.id)} invite={invite} />;
    case 'muse': {
      const [policies, connections, tags] = await Promise.all([getPolicies(user.id), listConnections(user.id), listTags(user.id)]);
      const sources = connections.filter(c => c.status === 'connected').map(c => c.source.replace('_', ' '));
      return <MuseStep summary={museSummary(policies, {sources, tags: tags.map(t => t.tag)})} invite={invite} name={user.name} />;
    }
  }
}
