import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {getProfile, updateProfile, type Profile} from '@/lib/profile-queries';
import {MAX_DATA_URL_LENGTH, isImageDataUrl} from '@/lib/image-upload';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: Request, {params}: Ctx) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({error: 'unauthorized'}, {status: 401});
  const {id} = await params;
  const userId = id === 'me' ? viewer.id : Number(id);
  if (!Number.isInteger(userId)) return NextResponse.json({error: 'bad id'}, {status: 400});
  const profile = await getProfile(userId, viewer.id);
  if (!profile) return NextResponse.json({error: 'not found'}, {status: 404});
  return NextResponse.json(redactProfile(profile, viewer.id));
}

/** Only the owner sees their login identity and contact fields; friends see the birthday, everyone else only the public card. */
function redactProfile(profile: Profile, viewerId: number): Profile {
  if (profile.user.id === viewerId) return profile;
  const {email: _email, supertokensId: _st, ...user} = profile.user;
  const friends = profile.friendship === 'friends';
  return {
    ...profile,
    user: {...user, email: '', supertokensId: null},
    details: {...profile.details, phone: null, birthday: friends ? profile.details.birthday : null},
  };
}

const isUrl = (v: unknown) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v) && v.length <= 2000;

/** Photos are either remote http(s) URLs or base64 `data:image/*` URLs produced by the client-side uploader. */
function imageError(field: string, v: unknown): string | null {
  if (isUrl(v) || isImageDataUrl(v)) return null;
  if (typeof v === 'string' && v.startsWith('data:')) {
    return v.length > MAX_DATA_URL_LENGTH ? `${field} is too large: uploaded photos must be under 400 KB` : `${field} must be a base64 JPEG, PNG, WebP or GIF data URL`;
  }
  return `${field} must be an http(s) URL or an image data URL`;
}

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
    if (body.coverUrl !== null && body.coverUrl !== '') {
      const err = imageError('coverUrl', body.coverUrl);
      if (err) return NextResponse.json({error: err}, {status: err.includes('too large') ? 413 : 400});
    }
    patch.coverUrl = (body.coverUrl as string | null) || null;
  }
  if ('avatarUrl' in body) {
    const err = imageError('avatarUrl', body.avatarUrl);
    if (err) return NextResponse.json({error: err}, {status: err.includes('too large') ? 413 : 400});
    patch.avatarUrl = body.avatarUrl as string;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({error: 'nothing to update'}, {status: 400});
  const user = await updateProfile(userId, patch);
  return NextResponse.json(user);
}
