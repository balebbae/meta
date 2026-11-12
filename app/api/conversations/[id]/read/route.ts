import {NextResponse, type NextRequest} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {isMember, markRead} from '@/lib/messaging-queries';

type Ctx = {params: Promise<{id: string}>};

export async function POST(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!(await isMember(id, user.id))) return notFound();
    const lastReadMessageId = await markRead(id, user.id);
    return NextResponse.json({lastReadMessageId});
  });
}
