import {NextResponse} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, forbidden, notFound, readJson, withUser} from '@/lib/api';
import {listGroupPosts} from '@/lib/secondary-queries';
import {isAllowedImageUrl} from '@/lib/image-upload';

type Ctx = {params: Promise<{id: string}>};

export async function GET(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    return NextResponse.json({posts: await listGroupPosts(Number(id), user.id)});
  });
}

export async function POST(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const {id} = await params;
    const groupId = Number(id);
    const group = await sql`select id from groups where id = ${groupId}`;
    if (!group[0]) return notFound();
    const member = await sql`select 1 from group_members where group_id = ${groupId} and user_id = ${user.id}`;
    if (!member[0]) return forbidden();
    const body = await readJson<{content?: string; imageUrl?: string | null}>(req);
    const content = body?.content?.trim();
    if (!content) return badRequest('content is required');
    if (content.length > 10_000) return badRequest('post is too long');
    const imageUrl = body?.imageUrl?.trim() || null;
    if (imageUrl && !isAllowedImageUrl(imageUrl)) return badRequest('imageUrl must be an http(s) URL or an image under 1.5 MB');
    const [row] = await sql`
      insert into group_posts (group_id, author_id, content, image_url)
      values (${groupId}, ${user.id}, ${content}, ${imageUrl})
      returning id`;
    return NextResponse.json({id: row.id}, {status: 201});
  });
}
