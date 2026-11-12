import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {getConnector} from '@/lib/activities/connectors';
import {appOrigin} from '@/lib/activities/origin';

/** POST: begin connecting a source. Returns the ConnectResult (redirect | connected | instructions | unavailable). */
export async function POST(req: Request, ctx: {params: Promise<{source: string}>}) {
  return withUser(async user => {
    const {source} = await ctx.params;
    const connector = getConnector(source);
    if (!connector) return notFound();
    try {
      const result = await connector.connect(user.id, appOrigin(req));
      return NextResponse.json({result});
    } catch (err) {
      return NextResponse.json({result: {type: 'unavailable', reason: (err as Error).message}}, {status: 502});
    }
  });
}
