import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {listComments, mapComment} from '@/lib/queries';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: NextRequest, {params}: Ctx) {
  return withUser(async () => {
    const id = Number((await params).id);
    return NextResponse.json({comments: await listComments(id)});
  });
}

export async function POST(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const body = await readJson<{content?: string}>(req);
    const content = body?.content?.trim();
    if (!content) return badRequest('content is required');
    const [post] = await sql`select id, author_id from posts where id = ${id}`;
    if (!post) return notFound();
    const [row] = await sql`
      insert into comments (post_id, author_id, content) values (${id}, ${user.id}, ${content})
      returning id, post_id, content, created_at`;
    if ((post.author_id as number) !== user.id) {
      await sql`insert into notifications (user_id, actor_id, type, post_id, message)
        values (${post.author_id as number}, ${user.id}, 'comment', ${id}, ${user.name + ' commented on your post.'})`;
    }
    const comment = mapComment({...row, author_id: user.id, author_name: user.name, author_avatar: user.avatarUrl});
    return NextResponse.json({comment}, {status: 201});
  });
}
