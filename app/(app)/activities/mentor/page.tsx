import {redirect} from 'next/navigation';

/** Old URL (pushes and notifications already sent point here). */
export default async function OldMentorRoute({searchParams}: {searchParams: Promise<{offer?: string}>}) {
  const {offer} = await searchParams;
  redirect(offer ? `/activities/ahead?offer=${encodeURIComponent(offer)}` : '/activities/ahead');
}
