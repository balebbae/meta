'use client';

import {Text} from '@astryxdesign/core/Text';
import type {ComponentProps} from 'react';
import type {MentorRequestView} from '@/lib/activities/mentor';
import {MentorExchange} from '../MentorExchange';
import {MentorPage} from '../MentorPage';
import {useJson} from './nav';

type PageProps = ComponentProps<typeof MentorPage>;

/** Mentors panel: people a few months ahead, or one Muse-relayed conversation. Replaces /activities/ahead and /activities/ahead/[id]. */
export function MentorsPanel({request, offer}: {request: string | null; offer: string | null}) {
  return request ? <MentorThread id={request} /> : <MentorHome offer={offer} />;
}

function MentorHome({offer}: {offer: string | null}) {
  const offers = useJson<{offer: PageProps['offer']; matches: PageProps['matches']; adult: boolean}>('/api/mentor/offers');
  const reqs = useJson<{requests: PageProps['requests']}>('/api/mentor/requests');
  if (!offers.data || !reqs.data) return <Text color="secondary">{offers.error ?? reqs.error ?? 'Loading mentors…'}</Text>;
  return <MentorPage offer={offers.data.offer} matches={offers.data.matches} requests={reqs.data.requests} adult={offers.data.adult} highlight={offer ? Number(offer) : null} />;
}

function MentorThread({id}: {id: string}) {
  const {data, error} = useJson<{request: MentorRequestView}>(`/api/mentor/requests/${encodeURIComponent(id)}`);
  return data ? <MentorExchange key={id} initial={data.request} /> : <Text color="secondary">{error ?? 'Loading conversation…'}</Text>;
}
