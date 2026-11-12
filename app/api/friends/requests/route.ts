import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {listFriendRequests, listSuggestions} from '@/lib/profile-queries';

/** Incoming friend requests for the viewer, plus "People You May Know" suggestions. */
export async function GET() {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const [requests, suggestions] = await Promise.all([listFriendRequests(viewer.id), listSuggestions(viewer.id)]);
  return NextResponse.json({requests, suggestions});
}
