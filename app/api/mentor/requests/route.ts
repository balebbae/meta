import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {createRequest, listRequests} from '@/lib/activities/mentor';
import {sendPushToUser} from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withUser(async user => NextResponse.json({requests: await listRequests(user.id)}));
}

/** POST {mentorId}. Nothing about the mentor is revealed until they accept. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{mentorId?: number}>(req);
    const mentorId = Number(body?.mentorId);
    if (!mentorId) return badRequest('mentorId is required');
    const res = await createRequest(user.id, mentorId);
    if ('error' in res) return badRequest(res.error);
    await sendPushToUser(mentorId, {title: 'Activities · Mentor request', body: 'Someone asked your Muse how you did it. Review the request.', url: `/activities/mentor/${res.id}`, tag: `mentor-${res.id}`}).catch(() => {});
    return NextResponse.json({id: res.id}, {status: 201});
  });
}
