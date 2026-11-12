import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {acceptFriendRequest, getFriendshipState} from '@/lib/profile-queries';

export async function POST(req: Request) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const body = (await req.json().catch(() => ({}))) as {userId?: unknown};
  const userId = Number(body.userId);
  if (!Number.isInteger(userId) || userId === viewer.id) return NextResponse.json({error: 'bad userId'}, {status: 400});
  const state = await getFriendshipState(viewer.id, userId);
  if (state !== 'incoming') return NextResponse.json({error: 'no pending request from that user', friendship: state}, {status: 409});
  const friendship = await acceptFriendRequest(viewer.id, userId);
  return NextResponse.json({friendship});
}
