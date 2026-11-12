import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {listSuggestions} from '@/lib/profile-queries';

export const dynamic = 'force-dynamic';

/** GET /api/friends/suggestions?q= — every registered user except the viewer and accepted friends, newest first. */
export async function GET(req: Request) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const suggestions = await listSuggestions(viewer.id, 200, q);
  return NextResponse.json({suggestions});
}
