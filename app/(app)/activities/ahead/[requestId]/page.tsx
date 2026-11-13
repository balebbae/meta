import {notFound, redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getRequest} from '@/lib/activities/mentor';
import {MentorExchange} from '@/components/activities/MentorExchange';

export const dynamic = 'force-dynamic';

/** /activities/ahead/[requestId] — advice exchange, then the Muse-relayed thread once connected. */
export default async function MentorRequestRoute({params}: {params: Promise<{requestId: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth/signin');
  const {requestId} = await params;
  const request = await getRequest(Number(requestId), user.id);
  if (!request) notFound();
  return <MentorExchange initial={request} />;
}
