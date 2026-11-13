import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';

export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{message?: string}>(req);
    const message = body?.message?.trim() ?? '';
    if (!message || message.length > 1000) return badRequest('message is required');
    await sql`insert into notifications (user_id, actor_id, type, message) values (${user.id}, ${user.id}, 'feedback', ${'Feedback: ' + message})`;
    return NextResponse.json({ok: true});
  });
}
