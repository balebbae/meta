import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {getQuestState, isQuestMember} from '@/lib/rally/queries';

type Ctx = {params: Promise<{id: string}>};

/** Dashboard state (polled every 3s): spec, hp, members' contribution, moves, dares, gear, rewards. */
export async function GET(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!id || !(await isQuestMember(id, user.id))) return notFound();
    const state = await getQuestState(id, user.id);
    if (!state) return notFound();
    return NextResponse.json(state);
  });
}
