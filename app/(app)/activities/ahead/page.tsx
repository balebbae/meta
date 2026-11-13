import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getUserTags} from '@/lib/activities/discover';
import {getOffer, isAdult, listRequests, matchMentors} from '@/lib/activities/mentor';
import {MentorPage} from '@/components/activities/MentorPage';

export const dynamic = 'force-dynamic';

/** /activities/ahead — people a few months ahead of you; you only ever talk through your Muses. */
export default async function MentorRoute({searchParams}: {searchParams: Promise<{offer?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const params = await searchParams;
  const tags = await getUserTags(user.id);
  const [offer, matches, requests, adult] = await Promise.all([getOffer(user.id), matchMentors(user.id, tags), listRequests(user.id), isAdult(user.id)]);
  return <MentorPage offer={offer} matches={matches} requests={requests} adult={adult} highlight={params.offer ? Number(params.offer) : null} />;
}
