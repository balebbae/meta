import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {createGroup, findOrCreateDm, getConversation, listConversations} from '@/lib/messaging-queries';

export async function GET() {
  return withUser(async user => {
    const conversations = await listConversations(user.id);
    return NextResponse.json({conversations, unreadCount: conversations.filter(c => c.unreadCount > 0).length});
  });
}

/** Body: {memberIds: number[], name?: string, imageUrl?: string}. One member and no name => 1:1 find-or-create; otherwise a group. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{memberIds?: number[]; name?: string; imageUrl?: string}>(req);
    const memberIds = Array.from(new Set((body?.memberIds ?? []).map(Number).filter(n => Number.isInteger(n) && n > 0 && n !== user.id)));
    if (!memberIds.length) return badRequest('memberIds is required');
    const name = body?.name?.trim() || null;
    if (memberIds.length === 1 && !name) {
      const {id, created} = await findOrCreateDm(user.id, memberIds[0]);
      return NextResponse.json({conversation: await getConversation(id, user.id), created}, {status: created ? 201 : 200});
    }
    const id = await createGroup(user.id, memberIds, name, body?.imageUrl?.trim() || null);
    return NextResponse.json({conversation: await getConversation(id, user.id), created: true}, {status: 201});
  });
}
