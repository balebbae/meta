import {NextResponse, type NextRequest} from 'next/server';
import {forbidden, notFound, withUser} from '@/lib/api';
import {getConversation, leaveConversation} from '@/lib/messaging-queries';

type Ctx = {params: Promise<{id: string}>};

export async function DELETE(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const existing = await getConversation(id, user.id);
    if (!existing) return notFound();
    if (!existing.isGroup) return forbidden();
    await leaveConversation(id, user.id);
    return NextResponse.json({ok: true});
  });
}
