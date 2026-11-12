import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {listUserFriends} from '@/lib/profile-queries';

export async function GET(req: Request, {params}: {params: Promise<{id: string}>}) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await params;
  const userId = id === 'me' ? viewer.id : Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({error: 'bad id'}, {status: 400});
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? 200) || 200, 500);
  return NextResponse.json(await listUserFriends(userId, viewer.id, limit));
}
