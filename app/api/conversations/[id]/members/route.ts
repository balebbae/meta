import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, forbidden, notFound, readJson, withUser} from '@/lib/api';
import {addMembers, getConversation} from '@/lib/messaging-queries';

type Ctx = {params: Promise<{id: string}>};

/** Body: {userIds: number[]}. Groups only. */
export async function POST(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const existing = await getConversation(id, user.id);
    if (!existing) return notFound();
    if (!existing.isGroup) return forbidden();
    const body = await readJson<{userIds?: number[]}>(req);
    const userIds = Array.from(new Set((body?.userIds ?? []).map(Number).filter(n => Number.isInteger(n) && n > 0)));
    if (!userIds.length) return badRequest('userIds is required');
    await addMembers(id, userIds);
    return NextResponse.json({conversation: await getConversation(id, user.id)});
  });
}
