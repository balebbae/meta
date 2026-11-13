import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {isCallState, pickIncoming} from '@/lib/calls';
import {sql} from '@/lib/db';

export async function GET() {
  return withUser(async user => {
    const rows = await sql`
      select c.id, c.call_state
      from conversations c
      join conversation_members m on m.conversation_id = c.id and m.user_id = ${user.id}
      where c.call_state is not null`;
    const calls = rows.flatMap(row => {
      try {
        const state = typeof row.call_state === 'string' ? JSON.parse(row.call_state) : row.call_state;
        return isCallState(state) ? [{conversationId: Number(row.id), state}] : [];
      } catch {
        return [];
      }
    });
    const incoming = pickIncoming(calls, user.id);
    return NextResponse.json({call: incoming ? {conversationId: incoming.conversationId, mode: incoming.state.mode} : null});
  });
}
