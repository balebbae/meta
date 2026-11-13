import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {checkIn, getGoal} from '@/lib/activities/goals';

type Ctx = {params: Promise<{id: string}>};

/** Muse Spark reads the roadmap + the owner's own rounded activity and replans the next 7 days. */
export async function POST(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const goal = await getGoal(Number((await params).id), user.id);
    if (!goal) return notFound();
    return NextResponse.json({goal: await checkIn(goal)});
  });
}
