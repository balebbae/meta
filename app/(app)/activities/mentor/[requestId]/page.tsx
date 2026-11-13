import {redirect} from 'next/navigation';

/** Old URL (pushes and notifications already sent point here). */
export default async function OldMentorRequestRoute({params}: {params: Promise<{requestId: string}>}) {
  redirect(`/activities/ahead/${encodeURIComponent((await params).requestId)}`);
}
