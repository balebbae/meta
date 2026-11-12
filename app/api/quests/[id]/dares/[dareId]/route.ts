import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {logMove} from '@/lib/rally/queries';

type Ctx = {params: Promise<{id: string; dareId: string}>};

/** Body: {image?(data URL, required when the dare needsProof), note?}. */
export async function POST(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id, dareId} = await params;
    const body = await readJson<{image?: string; note?: string}>(req);
    if (body?.image && (!body.image.startsWith('data:image/') || body.image.length > 1_500_000)) return badRequest('image must be a data URL under ~1 MB');
    const result = await logMove(Number(id), {id: user.id, name: user.name}, {source: body?.image ? 'photo' : 'manual', dareId, image: body?.image ?? null, note: body?.note ?? null});
    if (!result.ok) return NextResponse.json({error: result.error}, {status: result.status});
    return NextResponse.json(result, {status: 201});
  });
}
