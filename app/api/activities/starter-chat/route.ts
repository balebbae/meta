import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {starterChat} from '@/lib/activities/starter-chat';

/** "Just tell my Muse" (§4 step 2): one message -> structured answers + tags, confirmed by the user. */
export async function POST(req: Request) {
  return withUser(async () => {
    const body = await readJson<{text?: string}>(req);
    const text = body?.text?.trim();
    if (!text) return badRequest('text required');
    return NextResponse.json(await starterChat(text.slice(0, 800)));
  });
}
