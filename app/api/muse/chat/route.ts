import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {museConfigured, museText} from '@/lib/muse/client';

export async function POST(req: Request) {
  return withUser(async () => {
    if (!museConfigured()) return NextResponse.json({error: 'Meta AI is not configured on this server'}, {status: 503});
    const body = await readJson<{message?: string}>(req);
    const message = body?.message?.trim() ?? '';
    if (!message || message.length > 2000) return badRequest('message is required');
    try {
      return NextResponse.json({reply: await museText(message)});
    } catch {
      return NextResponse.json({error: 'Meta AI could not answer'}, {status: 502});
    }
  });
}
