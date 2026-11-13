import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, forbidden, notFound, readJson, withUser} from '@/lib/api';
import {addMembers, addSystemMessage, getConversation} from '@/lib/messaging-queries';

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
    const already = new Set(existing.members.map(m => m.id));
    await addMembers(id, userIds);
    const conversation = await getConversation(id, user.id);
    const added = (conversation?.members ?? []).filter(m => userIds.includes(m.id) && !already.has(m.id)).map(m => m.name);
    if (added.length) await addSystemMessage(id, user, `${user.name} added ${added.join(', ')} to the group.`);
    return NextResponse.json({conversation});
  });
}
