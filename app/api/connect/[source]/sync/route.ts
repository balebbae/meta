import {NextResponse} from 'next/server';
import {badRequest, notFound, withUser} from '@/lib/api';
import {getConnection} from '@/lib/activities/connections';
import * as strava from '@/lib/activities/connectors/strava';
import * as whoop from '@/lib/activities/connectors/whoop';

// sources with a pull API; the rest push (webhooks, Shortcut, export upload)
const BACKFILL = {strava: strava.backfill, whoop: whoop.backfill} as const;

/** POST: pull the latest activities from an already-connected source into the vault. Returns {imported}. */
export async function POST(_req: Request, ctx: {params: Promise<{source: string}>}) {
  return withUser(async user => {
    const {source} = await ctx.params;
    if (!(source in BACKFILL)) return notFound();
    const id = source as keyof typeof BACKFILL;
    const conn = await getConnection(user.id, id);
    if (conn?.status !== 'connected') return badRequest(`Connect ${id} first`);
    try {
      return NextResponse.json({imported: await BACKFILL[id](conn)});
    } catch (err) {
      return NextResponse.json({error: (err as Error).message.slice(0, 160)}, {status: 502});
    }
  });
}
