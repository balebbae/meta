import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {countUnreadConversations} from '@/lib/messaging-queries';

export async function GET() {
  return withUser(async user => NextResponse.json({unreadCount: await countUnreadConversations(user.id)}));
}
