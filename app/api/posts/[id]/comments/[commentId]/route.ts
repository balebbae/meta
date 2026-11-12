import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {forbidden, notFound, withUser} from '@/lib/api';

type Ctx = {params: Promise<{id: string; commentId: string}>};

export async function DELETE(_req: NextRequest, {params}: Ctx) {
  return withUser(async user => {
    const {id, commentId} = await params;
    const [row] = await sql`
      select c.author_id, p.author_id as post_author_id
      from comments c join posts p on p.id = c.post_id
      where c.id = ${Number(commentId)} and c.post_id = ${Number(id)}`;
    if (!row) return notFound();
    if (row.author_id !== user.id && row.post_author_id !== user.id) return forbidden();
    await sql`delete from comments where id = ${Number(commentId)}`;
    return NextResponse.json({ok: true});
  });
}
