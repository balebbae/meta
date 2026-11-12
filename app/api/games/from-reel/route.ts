import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {isMember} from '@/lib/messaging-queries';
import {createQuest, getReelSource} from '@/lib/rally/queries';

/** Body: {reelId, conversationId}. Reel exercises -> GameSpec -> quest + quest_card in the thread. */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{reelId?: number; conversationId?: number}>(req);
    const reelId = Number(body?.reelId);
    const conversationId = Number(body?.conversationId);
    if (!reelId || !conversationId) return badRequest('reelId and conversationId required');
    if (!(await isMember(conversationId, user.id))) return notFound();
    const source = await getReelSource(reelId);
    if (!source) return notFound();
    const {quest, museUsed} = await createQuest({source, conversationId, creator: {id: user.id, name: user.name}});
    return NextResponse.json({quest, museUsed}, {status: 201});
  });
}
