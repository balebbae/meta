import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {memberOfGame} from '@/lib/rally/game-access';
import {getSwimState} from '@/lib/rally/swim-store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await memberOfGame('swim_journeys', id, user.id))) return notFound();
    const state = await getSwimState(id, user.id);
    return state ? NextResponse.json(state, {headers: {'Cache-Control': 'no-store'}}) : notFound();
  });
}
