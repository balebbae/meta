import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {connectAction, createRequest, listRequests} from '@/lib/activities/mentor';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withUser(async user => NextResponse.json({requests: await listRequests(user.id)}));
}

/** POST {mentorId, connect?}. Advice starts right away (opting in is the consent); connect also asks to connect. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{mentorId?: number; connect?: boolean}>(req);
    const mentorId = Number(body?.mentorId);
    if (!mentorId) return badRequest('mentorId is required');
    const res = await createRequest(user.id, mentorId);
    if ('error' in res) return badRequest(res.error);
    if (body?.connect) await connectAction(res.id, user.id, 'request');
    return NextResponse.json({id: res.id}, {status: res.created ? 201 : 200});
  });
}
