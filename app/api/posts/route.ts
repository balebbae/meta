import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {AUDIENCES, badRequest, readJson, withUser} from '@/lib/api';
import {getPost, listFeedPage, toIsoCursor} from '@/lib/queries';
import {MAX_DATA_URL_LENGTH, isImageDataUrl} from '@/lib/image-upload';

export async function GET(req: NextRequest) {
  return withUser(async user => {
    const cursor = req.nextUrl.searchParams.get('cursor');
    if (cursor && !toIsoCursor(cursor)) return badRequest('cursor must be a date');
    const limit = Math.min(20, Number(req.nextUrl.searchParams.get('limit') ?? 10) || 10);
    const page = await listFeedPage(user.id, cursor || null, limit);
    return NextResponse.json(page);
  });
}

export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{content?: string; imageUrl?: string | null; audience?: string}>(req);
    const content = body?.content?.trim();
    if (!content) return badRequest('content is required');
    const audience = AUDIENCES.includes((body?.audience ?? '') as (typeof AUDIENCES)[number]) ? body!.audience! : 'friends';
    const imageUrl = body?.imageUrl?.trim() || null;
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl) && !isImageDataUrl(imageUrl as unknown)) {
      return badRequest(imageUrl.length > MAX_DATA_URL_LENGTH ? 'imageUrl is too large: uploaded photos must be under 400 KB' : 'imageUrl must be an http(s) URL or an image data URL');
    }
    const [row] = await sql`
      insert into posts (author_id, content, image_url, audience)
      values (${user.id}, ${content}, ${imageUrl}, ${audience})
      returning id`;
    const post = await getPost(row.id as number, user.id);
    return NextResponse.json({post}, {status: 201});
  });
}
