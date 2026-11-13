import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {connectAction, getRequest, type ConnectAction} from '@/lib/activities/mentor';

const ACTIONS: ConnectAction[] = ['request', 'accept', 'decline', 'reveal', 'hide'];

/** POST {action}: seeker requests to connect; the person ahead accepts/declines; either side reveals or hides their own name. */
export async function POST(req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  return withUser(async user => {
    const id = Number((await ctx.params).id);
    const body = await readJson<{action?: string}>(req);
    const action = body?.action as ConnectAction;
    if (!ACTIONS.includes(action)) return badRequest('Unknown action');
    if (!id || !(await connectAction(id, user.id, action))) return notFound();
    return NextResponse.json({request: await getRequest(id, user.id)});
  });
}
