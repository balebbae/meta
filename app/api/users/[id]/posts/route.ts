import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {listUserPosts} from '@/lib/profile-queries';

export async function GET(req: Request, {params}: {params: Promise<{id: string}>}) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await params;
  const userId = id === 'me' ? viewer.id : Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({error: 'bad id'}, {status: 400});
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get('limit') ?? 30) || 30, 100);
  const offset = Math.max(Number(sp.get('offset') ?? 0) || 0, 0);
  return NextResponse.json(await listUserPosts(userId, viewer.id, limit, offset));
}
