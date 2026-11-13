import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {createGoal, listGoals} from '@/lib/activities/goals';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withUser(async user => NextResponse.json({goals: await listGoals(user.id)}));
}

/** Body: {text}. Muse Spark turns the sentence into a roadmap (template plan when Muse is offline). */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{text?: string}>(req);
    const text = body?.text?.trim() ?? '';
    if (text.length < 3) return badRequest('Tell your Muse what you want to do');
    const goal = await createGoal(user.id, text);
    return NextResponse.json({goal}, {status: 201});
  });
}
