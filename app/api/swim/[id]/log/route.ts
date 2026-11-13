import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {isAllowedImageUrl} from '@/lib/image-upload';
import {memberOfGame} from '@/lib/rally/game-access';
import {logSwim} from '@/lib/rally/swim-store';

/** Body: {meters} typed, or {image}: a watch / lap-counter photo (data URL) that Ember reads. */
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('swim_journeys', id, user.id))) return notFound();
    const body = await readJson<{meters?: number; image?: string}>(req);
    if (body?.image != null && !(body.image.startsWith('data:') && isAllowedImageUrl(body.image))) return badRequest('image must be a photo under 1.5 MB');
    const r = await logSwim(id, {id: user.id, name: user.name}, {meters: body?.meters ?? null, image: body?.image ?? null});
    if ('error' in r) return NextResponse.json({error: r.error}, {status: r.status});
    return NextResponse.json(r, {status: 201});
  });
}
