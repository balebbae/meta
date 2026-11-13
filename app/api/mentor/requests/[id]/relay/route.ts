import {NextResponse, type NextRequest} from 'next/server';
import {notFound, readJson, withUser} from '@/lib/api';
import {listRelay, sendRelay} from '@/lib/activities/mentor';

type Ctx = {params: Promise<{id: string}>};

/** GET ?after= : the Muse-relayed thread (your own raw text only comes back to you). */
export async function GET(req: NextRequest, ctx: Ctx) {
  return withUser(async user => {
    const id = Number((await ctx.params).id);
    const messages = id ? await listRelay(id, user.id, Number(req.nextUrl.searchParams.get('after')) || 0) : null;
    return messages ? NextResponse.json({messages}) : notFound();
  });
}

/** POST {text}: your Muse rewrites it and passes it on. */
export async function POST(req: NextRequest, ctx: Ctx) {
  return withUser(async user => {
    const id = Number((await ctx.params).id);
    if (!id) return notFound();
    const body = await readJson<{text?: string}>(req);
    const res = await sendRelay(id, user, String(body?.text ?? ''));
    if ('error' in res) return NextResponse.json({error: res.error}, {status: res.status});
    return NextResponse.json(res, {status: 201});
  });
}
