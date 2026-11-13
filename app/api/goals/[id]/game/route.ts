import {NextResponse} from 'next/server';
import {notFound, readJson, withUser} from '@/lib/api';
import {getGoal, startGoalGame} from '@/lib/activities/goals';

type Ctx = {params: Promise<{id: string}>};

/** Body: {conversationId?}. No chat = your solo Muse game; a chat you're in = the same week for the group. */
export async function POST(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const goal = await getGoal(Number((await params).id), user.id);
    if (!goal) return notFound();
    const body = await readJson<{conversationId?: number}>(req);
    try {
      const res = await startGoalGame(goal, {id: user.id, name: user.name}, body?.conversationId ? Number(body.conversationId) : undefined);
      return NextResponse.json({...res, url: `/activities/games/${res.questId}`}, {status: 201});
    } catch (err) {
      if (err instanceof Error && err.message === 'not a member') return notFound();
      throw err;
    }
  });
}
