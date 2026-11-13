'use client';

import {useEffect, useRef} from 'react';
import {Text} from '@astryxdesign/core/Text';
import type {ConnectorCard} from '@/lib/activities/connectors';
import {INVITE_STEPS, ONBOARDING_STEPS, type ActivityProfile, type OnboardingStep} from '@/lib/activities/onboarding';
import type {PolicyMatrix} from '@/lib/activities/policies';
import {sourceLabel} from '@/lib/activities/source-label';
import {museSummary} from '@/lib/activities/summary';
import type {Platform, UserTag} from '@/lib/activities/types';
import type {HeroPick} from '@/lib/kingdom/cast';
import type {PublicConnection} from '../ConnectorHub';
import {CharacterStep} from '../onboarding/CharacterStep';
import {ConnectStep} from '../onboarding/ConnectStep';
import {MuseStep} from '../onboarding/MuseStep';
import {PrivacyStep} from '../onboarding/PrivacyStep';
import {QuestionsStep} from '../onboarding/QuestionsStep';
import {TagsStep} from '../onboarding/TagsStep';
import {useJson} from './nav';

type Profile = {profile: ActivityProfile; tags: UserTag[]; policies: PolicyMatrix; connections: PublicConnection[]; hero: HeroPick | null};

/** Onboarding as a panel: the same five steps (two for a game invite), StepShell moves between them in place. Replaces /activities/onboarding/[step]. */
export function OnboardingPanel({step, invite, viewerName}: {step: string | null; invite: number | null; viewerName: string}) {
  // one cached fetch for the whole flow: steps paint instantly, and we refresh after each save so later steps see what earlier ones wrote
  const {data, error, reload} = useJson<Profile>('/api/activities/profile');
  const steps = invite ? INVITE_STEPS : [...ONBOARDING_STEPS];
  let s: OnboardingStep = steps.includes(step as OnboardingStep) ? (step as OnboardingStep) : steps[0];
  const last = useRef(s);
  useEffect(() => {
    if (last.current !== s) {
      last.current = s;
      reload();
    }
  }, [s, reload]);
  const current = data?.profile.onboardingStep;
  // steps only open in order (privacy can't be skipped by editing the URL); finished users may revisit any step
  if (current && current !== 'done') {
    const ci = steps.indexOf(current as OnboardingStep);
    if (steps.indexOf(s) > ci + 1) s = steps[Math.min(ci + 1, steps.length - 1)];
  }
  const needsCards = s === 'connect';
  const conn = useJson<{platform: Platform; cards: ConnectorCard[]; connections: PublicConnection[]}>(needsCards ? '/api/activities/connections' : null);

  useEffect(() => {
    if (current && current !== 'done' && current !== s) void fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({step: s})});
  }, [current, s]);

  if (!data || (needsCards && !conn.data)) return <Text color="secondary">{error ?? conn.error ?? 'Loading…'}</Text>;
  switch (s) {
    case 'character':
      return <CharacterStep initial={data.hero} invite={invite} />;
    case 'tags':
      return <TagsStep initial={data.tags} invite={invite} />;
    case 'questions':
      return <QuestionsStep profile={data.profile} invite={invite} />;
    case 'connect':
      return <ConnectStep platform={conn.data!.platform} cards={conn.data!.cards} connections={conn.data!.connections} invite={invite} />;
    case 'privacy':
      return <PrivacyStep policies={data.policies} invite={invite} />;
    case 'muse':
      return <MuseStep summary={museSummary(data.policies, {sources: data.connections.filter(c => c.status === 'connected').map(c => sourceLabel(c.source)), tags: data.tags.map(t => t.tag)})} invite={invite} name={viewerName} />;
  }
}
