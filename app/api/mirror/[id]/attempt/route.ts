import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {memberOfGame} from '@/lib/rally/game-access';
import {validPoses} from '@/lib/rally/mirror';
import {submitAttempt} from '@/lib/rally/mirror-store';

/** Body: {poses} — the player's best pose (8 angles) per step. The server grades it; no video leaves the phone. */
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('mirror_matches', id, user.id))) return notFound();
    const body = await readJson<{poses?: unknown}>(req);
    const poses = body?.poses;
    if (!Array.isArray(poses) || !validPoses(poses, poses.length) || poses.length < 1 || poses.length > 5) return badRequest('not a pose list');
    if (poses.every(p => p.filter(v => v != null).length < 4)) return badRequest('No pose seen');
    const r = await submitAttempt(id, {id: user.id, name: user.name}, poses);
    if ('error' in r) return NextResponse.json({error: r.error}, {status: r.status});
    return NextResponse.json(r);
  });
}
