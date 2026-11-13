import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';

type Ctx = {params: Promise<{id: string}>};
type Kind = 'fitness' | 'feed';

function kindOf(value: unknown): Kind | null {
  return value === 'fitness' || value === 'feed' ? value : null;
}

async function reelExists(id: number, kind: Kind) {
  const [row] = kind === 'fitness'
    ? await sql`select id from reels where id = ${id}`
    : await sql`select id from feed_reels where id = ${id}`;
  return Boolean(row);
}

export async function GET(req: NextRequest, {params}: Ctx) {
  return withUser(async () => {
    const id = Number((await params).id);
    const kind = kindOf(req.nextUrl.searchParams.get('kind'));
    if (!Number.isInteger(id) || !kind) return notFound();
    const rows = await sql`
      select c.id, c.content, c.created_at, u.name as author_name
      from reel_comments c join users u on u.id = c.author_id
      where c.reel_id = ${id} and c.reel_kind = ${kind}
      order by c.created_at asc
      limit 50`;
    return NextResponse.json({
      comments: rows.map(row => ({id: Number(row.id), authorName: String(row.author_name), content: String(row.content), createdAt: String(row.created_at)})),
    });
  });
}

export async function POST(req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return notFound();
    const body = await readJson<{content?: string; kind?: string}>(req);
    const kind = kindOf(body?.kind);
    const content = body?.content?.trim() ?? '';
    if (!kind || !content || content.length > 500) return badRequest('content is required');
    if (!(await reelExists(id, kind))) return notFound();
    const [row] = await sql`
      insert into reel_comments (reel_id, reel_kind, author_id, content) values (${id}, ${kind}, ${user.id}, ${content})
      returning id, content, created_at`;
    return NextResponse.json({comment: {id: Number(row.id), authorName: user.name, content: String(row.content), createdAt: String(row.created_at)}}, {status: 201});
  });
}
