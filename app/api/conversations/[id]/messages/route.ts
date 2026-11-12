import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {isMember, listMessages, sendMessage} from '@/lib/messaging-queries';

type Ctx = {params: Promise<{id: string}>};

/** ?after=<id> returns newer messages (polling); ?before=<id> pages back; neither returns the latest 50. */
export async function GET(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await isMember(id, user.id))) return notFound();
    const q = req.nextUrl.searchParams;
    const after = q.get('after');
    const before = q.get('before');
    const limit = q.get('limit');
    const messages = await listMessages(id, {
      after: after ? Number(after) : undefined,
      before: before ? Number(before) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json({messages});
  });
}

/** Body: {body: string, imageUrl?: string}. */
export async function POST(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await isMember(id, user.id))) return notFound();
    const data = await readJson<{body?: string; imageUrl?: string | null}>(req);
    const body = (data?.body ?? '').trim();
    const imageUrl = data?.imageUrl?.trim() || null;
    if (!body && !imageUrl) return badRequest('body or imageUrl is required');
    if (body.length > 5000) return badRequest('message is too long');
    const message = await sendMessage(id, {id: user.id, name: user.name}, body, imageUrl);
    return NextResponse.json({message}, {status: 201});
  });
}
