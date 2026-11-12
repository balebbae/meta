import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {withUser} from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Does this group run a weekly Rally (quests.group_id)? */
export async function GET(_req: NextRequest, ctx: {params: Promise<{id: string}>}) {
  return withUser(async () => {
    const {id} = await ctx.params;
    const rows = await sql`select id, title, template, status from quests where group_id = ${Number(id)} order by id desc limit 1`.catch(() => []);
    const q = rows[0];
    return NextResponse.json({hasRally: !!q, quest: q ? {id: q.id, title: q.title, template: q.template, status: q.status} : null});
  });
}
