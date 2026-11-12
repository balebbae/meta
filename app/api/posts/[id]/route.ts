import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {AUDIENCES, badRequest, forbidden, notFound, readJson, withUser} from '@/lib/api';
import {getPost} from '@/lib/queries';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const post = await getPost(id, user.id);
    return post ? NextResponse.json({post}) : notFound();
  });
}

export async function PATCH(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const existing = await getPost(id, user.id);
    if (!existing) return notFound();
    if (existing.author.id !== user.id) return forbidden();
    const body = await readJson<{content?: string; audience?: string; imageUrl?: string | null}>(req);
    const content = body?.content?.trim() ?? existing.content;
    if (!content) return badRequest('content is required');
    const audience = AUDIENCES.includes((body?.audience ?? '') as (typeof AUDIENCES)[number]) ? body!.audience! : existing.audience;
    const imageUrl = body?.imageUrl === undefined ? existing.imageUrl : body.imageUrl?.trim() || null;
    await sql`update posts set content = ${content}, audience = ${audience}, image_url = ${imageUrl}, updated_at = now() where id = ${id}`;
    return NextResponse.json({post: await getPost(id, user.id)});
  });
}

export async function DELETE(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const existing = await getPost(id, user.id);
    if (!existing) return notFound();
    if (existing.author.id !== user.id) return forbidden();
    await sql`delete from posts where id = ${id}`;
    return NextResponse.json({ok: true});
  });
}
