import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {memberOfGame} from '@/lib/rally/game-access';
import {playable, validReference} from '@/lib/rally/mirror';
import {markUnreadable, matchSteps, saveReference} from '@/lib/rally/mirror-store';

/** Body: the Reel's poses (angles + overlay points), read on the first player's phone. The first valid one wins. */
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('mirror_matches', id, user.id))) return notFound();
    const body = await readJson<unknown>(req);
    if (!validReference(body)) return badRequest('not a pose reference');
    // usable when most steps have a clear pose (intros and close-ups don't count against it)
    if (!playable(body, await matchSteps(id))) {
      // only a Reel with nobody in any frame is given up on; a thin read (slow phone, slow stream) can be retried
      if (!body.points.some(Boolean)) {
        await markUnreadable(id);
        return badRequest('No one is clearly visible in this Reel. Pick another one.');
      }
      return badRequest('Couldn’t read the poses this time. Tap Retry.');
    }
    return NextResponse.json({saved: await saveReference(id, body)});
  });
}
