import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {memberOfGame} from '@/lib/rally/game-access';
import {validReference} from '@/lib/rally/mirror';
import {saveReference} from '@/lib/rally/mirror-store';

/** Body: the Reel's poses (angles + overlay points), read on the first player's phone. The first valid one wins. */
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('mirror_matches', id, user.id))) return notFound();
    const body = await readJson<unknown>(req);
    if (!validReference(body)) return badRequest('not a pose reference');
    const visible = body.points.filter(Boolean).length;
    if (visible < body.frames.length * 0.4) return badRequest('No one is clearly visible in this Reel.');
    return NextResponse.json({saved: await saveReference(id, body)});
  });
}
