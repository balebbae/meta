import {NextResponse} from 'next/server';
import {notFound, readJson, withUser} from '@/lib/api';
import {getConnector} from '@/lib/activities/connectors';

/** POST {deleteData?: boolean}: revoke the source; optionally wipe its vault events. */
export async function POST(req: Request, ctx: {params: Promise<{source: string}>}) {
  return withUser(async user => {
    const {source} = await ctx.params;
    const connector = getConnector(source);
    if (!connector) return notFound();
    const body = (await readJson<{deleteData?: boolean}>(req)) ?? {};
    await connector.disconnect(user.id, Boolean(body.deleteData));
    return NextResponse.json({ok: true, deletedData: Boolean(body.deleteData)});
  });
}
