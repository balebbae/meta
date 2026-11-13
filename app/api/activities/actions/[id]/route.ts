import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {actOnAction} from '@/lib/activities/actions';

type Ctx = {params: Promise<{id: string}>};

/** POST {action: 'do' | 'dismiss'} → Register / Buy (simulated, no real payment) or "Not now". */
export async function POST(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const body = await readJson<{action?: string}>(req);
    if (!Number.isInteger(id) || (body?.action !== 'do' && body?.action !== 'dismiss')) return badRequest('action must be "do" or "dismiss"');
    const action = await actOnAction(user.id, id, body.action);
    return action ? NextResponse.json({action}) : notFound();
  });
}
