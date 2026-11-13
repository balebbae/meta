import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {archiveGoal, getGoal, goalMatches, setMilestone} from '@/lib/activities/goals';

export const dynamic = 'force-dynamic';
type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const goal = await getGoal(Number((await params).id), user.id);
    if (!goal) return notFound();
    return NextResponse.json({goal, matches: await goalMatches(goal)});
  });
}

/** Body: {milestoneId, done} to tick a milestone. */
export async function PATCH(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const goal = await getGoal(Number((await params).id), user.id);
    if (!goal) return notFound();
    const body = await readJson<{milestoneId?: string; done?: boolean}>(req);
    if (!body?.milestoneId || typeof body.done !== 'boolean' || !goal.plan.milestones.some(m => m.id === body.milestoneId)) return badRequest('milestoneId and done are required');
    return NextResponse.json({goal: await setMilestone(goal, body.milestoneId, body.done)});
  });
}

export async function DELETE(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const goal = await getGoal(Number((await params).id), user.id);
    if (!goal) return notFound();
    await archiveGoal(goal);
    return NextResponse.json({ok: true});
  });
}
