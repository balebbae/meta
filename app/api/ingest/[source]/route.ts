import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {appleHealthConnector, findUserByIngestToken} from '@/lib/activities/connectors/apple_health';
import {getConnector} from '@/lib/activities/connectors';
import {stravaConnector} from '@/lib/activities/connectors/strava';
import {verifyWhoopSignature, whoopConnector, whoopConfigured} from '@/lib/activities/connectors/whoop';
import {ouraConnector} from '@/lib/activities/connectors';

/**
 * Inbound data (§5.3). Webhooks: whoop (HMAC-SHA256 over timestamp+body), strava, oura.
 * Apple Health Shortcut: POST /api/ingest/apple-health with "Authorization: Bearer <per-user ingest token>".
 * Signed-in users may also POST to manual | mock to ingest their own payload.
 */
export async function POST(req: Request, ctx: {params: Promise<{source: string}>}) {
  const {source} = await ctx.params;
  const rawBody = await req.text();
  const parse = () => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  };

  if (source === 'whoop') {
    if (!whoopConfigured()) return NextResponse.json({error: 'WHOOP not configured'}, {status: 503});
    if (!verifyWhoopSignature(rawBody, req.headers.get('x-whoop-signature-timestamp'), req.headers.get('x-whoop-signature'))) {
      return NextResponse.json({error: 'bad signature'}, {status: 401});
    }
    const events = await whoopConnector.ingest(0, parse());
    return NextResponse.json({ok: true, imported: events.length});
  }
  if (source === 'strava') {
    const events = await stravaConnector.ingest(0, parse());
    return NextResponse.json({ok: true, imported: events.length});
  }
  if (source === 'oura') {
    const events = await ouraConnector.ingest(0, parse());
    return NextResponse.json({ok: true, imported: events.length});
  }
  if (source === 'apple-health' || source === 'apple_health') {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    let userId = await findUserByIngestToken(token);
    if (!userId) userId = (await getSessionUser())?.id ?? null;
    if (!userId) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    const events = await appleHealthConnector.ingest(userId, parse());
    return NextResponse.json({ok: true, imported: events.length});
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const connector = getConnector(source);
  if (!connector || !['manual', 'mock'].includes(source)) return NextResponse.json({error: 'Not found'}, {status: 404});
  const events = await connector.ingest(user.id, parse() ?? {});
  return NextResponse.json({ok: true, imported: events.length});
}

/** Strava webhook subscription handshake: echo hub.challenge. */
export async function GET(req: Request, ctx: {params: Promise<{source: string}>}) {
  const {source} = await ctx.params;
  const url = new URL(req.url);
  if (source === 'strava' && url.searchParams.get('hub.mode') === 'subscribe') {
    // No guessable default: without STRAVA_VERIFY_TOKEN set, nobody can register a webhook against us.
    const token = process.env.STRAVA_VERIFY_TOKEN;
    if (!token || url.searchParams.get('hub.verify_token') !== token) return NextResponse.json({error: 'bad verify token'}, {status: 403});
    return NextResponse.json({'hub.challenge': url.searchParams.get('hub.challenge')});
  }
  return NextResponse.json({ok: true, source});
}
