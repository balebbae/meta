import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {logMove, type MoveSource} from '@/lib/rally/queries';

type Ctx = {params: Promise<{id: string}>};
const SOURCES: MoveSource[] = ['manual', 'photo', 'voice', 'vault'];

/** Body: {source, vaultEventId?, note?, image?(data URL), amount?}. Scores the move, updates HP, posts the rally_game card. */
export async function POST(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const body = await readJson<{source?: MoveSource; vaultEventId?: number; note?: string; image?: string; amount?: number}>(req);
    const source = body?.source ?? 'manual';
    if (!id || !SOURCES.includes(source)) return badRequest('valid source required');
    if (body?.image && (!body.image.startsWith('data:image/') || body.image.length > 1_500_000)) return badRequest('image must be a data URL under ~1 MB');
    const result = await logMove(id, {id: user.id, name: user.name}, {source, vaultEventId: body?.vaultEventId ?? null, note: body?.note ?? null, image: body?.image ?? null, amount: body?.amount ?? null});
    if (!result.ok) return NextResponse.json({error: result.error}, {status: result.status});
    return NextResponse.json(result, {status: 201});
  });
}
