import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {isMember} from '@/lib/messaging-queries';
import {createQuest} from '@/lib/rally/queries';

/** Body: {text, conversationId}. "Make us do planks every day" -> GameSpec -> quest + quest_card. */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{text?: string; conversationId?: number}>(req);
    const text = body?.text?.trim().slice(0, 300) ?? '';
    const conversationId = Number(body?.conversationId);
    if (text.length < 3 || !conversationId) return badRequest('text and conversationId required');
    if (!(await isMember(conversationId, user.id))) return notFound();
    const {quest, museUsed} = await createQuest({source: {kind: 'sentence', text}, conversationId, creator: {id: user.id, name: user.name}});
    return NextResponse.json({quest, museUsed}, {status: 201});
  });
}
