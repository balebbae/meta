import {NextResponse, type NextRequest} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {isMember} from '@/lib/messaging-queries';
import {listQuestsForConversation, listQuestsForUser} from '@/lib/rally/queries';

/** ?conversationId= lists Rally quests in a thread (members only); without it, the viewer's quests. */
export async function GET(req: NextRequest) {
  return withUser(async user => {
    const cid = req.nextUrl.searchParams.get('conversationId');
    if (cid) {
      const id = Number(cid);
      if (!id || !(await isMember(id, user.id))) return notFound();
      return NextResponse.json({quests: await listQuestsForConversation(id)});
    }
    return NextResponse.json({quests: await listQuestsForUser(user.id)});
  });
}
