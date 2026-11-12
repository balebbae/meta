import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, forbidden, notFound, readJson, withUser} from '@/lib/api';
import {getConversation, updateConversation} from '@/lib/messaging-queries';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const conversation = await getConversation(id, user.id);
    return conversation ? NextResponse.json({conversation}) : notFound();
  });
}

/** Body: {name?: string, imageUrl?: string|null}. Groups only. */
export async function PATCH(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const existing = await getConversation(id, user.id);
    if (!existing) return notFound();
    if (!existing.isGroup) return forbidden();
    const body = await readJson<{name?: string | null; imageUrl?: string | null}>(req);
    if (!body || (body.name === undefined && body.imageUrl === undefined)) return badRequest('name or imageUrl is required');
    await updateConversation(id, {
      name: body.name === undefined ? undefined : body.name?.trim() || null,
      imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl?.trim() || null,
    });
    return NextResponse.json({conversation: await getConversation(id, user.id)});
  });
}
