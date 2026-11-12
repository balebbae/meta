import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {getProfile, updateProfile} from '@/lib/profile-queries';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: Request, {params}: Ctx) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await params;
  const userId = id === 'me' ? viewer.id : Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({error: 'bad id'}, {status: 400});
  const profile = await getProfile(userId, viewer.id);
  if (!profile) return NextResponse.json({error: 'not found'}, {status: 404});
  return NextResponse.json(profile);
}

const isUrl = (v: unknown) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v) && v.length <= 2000;

export async function PATCH(req: Request, {params}: Ctx) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await params;
  const userId = id === 'me' ? viewer.id : Number(id);
  if (userId !== viewer.id) return NextResponse.json({error: 'forbidden'}, {status: 403});

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: {bio?: string | null; coverUrl?: string | null; avatarUrl?: string | null} = {};
  if ('bio' in body) {
    if (body.bio !== null && typeof body.bio !== 'string') return NextResponse.json({error: 'bio must be a string'}, {status: 400});
    const bio = (body.bio as string | null)?.trim() ?? null;
    if (bio && bio.length > 101) return NextResponse.json({error: 'bio must be 101 characters or fewer'}, {status: 400});
    patch.bio = bio || null;
  }
  if ('coverUrl' in body) {
    if (body.coverUrl !== null && body.coverUrl !== '' && !isUrl(body.coverUrl)) return NextResponse.json({error: 'coverUrl must be an http(s) URL'}, {status: 400});
    patch.coverUrl = (body.coverUrl as string | null) || null;
  }
  if ('avatarUrl' in body) {
    if (!isUrl(body.avatarUrl)) return NextResponse.json({error: 'avatarUrl must be an http(s) URL'}, {status: 400});
    patch.avatarUrl = body.avatarUrl as string;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({error: 'nothing to update'}, {status: 400});
  const user = await updateProfile(userId, patch);
  return NextResponse.json(user);
}
