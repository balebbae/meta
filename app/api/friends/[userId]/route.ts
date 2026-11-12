import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {removeFriendship} from '@/lib/profile-queries';

/** Unfriend, cancel an outgoing request, or decline an incoming one. */
export async function DELETE(_req: Request, {params}: {params: Promise<{userId: string}>}) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const userId = Number((await params).userId);
  if (!Number.isInteger(userId)) return NextResponse.json({error: 'bad userId'}, {status: 400});
  const friendship = await removeFriendship(viewer.id, userId);
  return NextResponse.json({friendship});
}
