import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {getConnection, upsertConnection} from '@/lib/activities/connections';
import {GOOGLE_HEALTH, OURA, exchangeStubCode} from '@/lib/activities/connectors/oauth-stubs';
import * as strava from '@/lib/activities/connectors/strava';
import * as whoop from '@/lib/activities/connectors/whoop';
import {appOrigin} from '@/lib/activities/origin';
import type {ConnectorId} from '@/lib/activities/types';

const OAUTH: ConnectorId[] = ['whoop', 'strava', 'oura', 'google_health'];

/** GET: OAuth redirect target. Validates state against connections.tokens.state, exchanges the code, backfills. */
export async function GET(req: Request, ctx: {params: Promise<{source: string}>}) {
  const {source} = await ctx.params;
  const origin = appOrigin(req);
  const back = (q: string) => NextResponse.redirect(`${origin}/activities/connect/${source}?${q}`);
  if (!OAUTH.includes(source as ConnectorId)) return back('error=unknown');
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(`${origin}/auth?next=${encodeURIComponent(`/activities/connect/${source}`)}`);
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error')) return back(`error=${encodeURIComponent(url.searchParams.get('error')!)}`);
  const pending = await getConnection(user.id, source as ConnectorId);
  if (!code || !state || !pending || pending.tokens.state !== state) return back('error=state');
  try {
    if (source === 'whoop') {
      const conn = await whoop.exchangeCode(user.id, code, origin);
      const n = await whoop.backfill(conn, 25);
      return back(`connected=1&imported=${n}`);
    }
    if (source === 'strava') {
      const conn = await strava.exchangeCode(user.id, code);
      const n = await strava.backfill(conn, 20);
      return back(`connected=1&imported=${n}`);
    }
    await exchangeStubCode(source === 'oura' ? OURA : GOOGLE_HEALTH, user.id, code, origin);
    return back('connected=1&imported=0');
  } catch (err) {
    await upsertConnection(user.id, source as ConnectorId, {status: 'error'});
    return back(`error=${encodeURIComponent((err as Error).message.slice(0, 120))}`);
  }
}
