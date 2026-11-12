import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {decide, getRequest, type MentorConsent} from '@/lib/activities/mentor';
import {sendPushToUser} from '@/lib/push';

/** Mentor accepts/declines, sets per-category consent toggles, anonymous flag and review-before-send. */
export async function POST(req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const {id} = await ctx.params;
    const body = await readJson<{accept?: boolean; consent?: MentorConsent; anonymous?: boolean}>(req);
    if (typeof body?.accept !== 'boolean') return badRequest('accept is required');
    const ok = await decide(Number(id), user.id, {accept: body.accept, consent: body.consent, anonymous: body.anonymous});
    if (!ok) return notFound();
    const view = await getRequest(Number(id), user.id);
    if (view && body.accept) await sendPushToUser(view.seeker.id, {title: 'Activities · Mentor accepted', body: 'Your mentor said yes. Your Muses are talking now.', url: `/activities/mentor/${id}`, tag: `mentor-${id}`}).catch(() => {});
    return NextResponse.json({request: view});
  });
}
