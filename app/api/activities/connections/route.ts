import {NextResponse} from 'next/server';
import {notFound, withUser} from '@/lib/api';
import {getConnection, listConnections, publicConnection} from '@/lib/activities/connections';
import {detectPlatform, getConnector, listConnectorCards} from '@/lib/activities/connectors';
import {appOrigin} from '@/lib/activities/origin';
import type {ConnectResult, ConnectorId} from '@/lib/activities/types';
import {sql} from '@/lib/db';

/** GET: every source card + your connections. ?source=strava: that one source's card, connection, vault count and (shortcut sources) setup result. */
export async function GET(req: Request) {
  return withUser(async user => {
    const platform = detectPlatform(req.headers.get('user-agent'));
    const cards = listConnectorCards(platform);
    const source = new URL(req.url).searchParams.get('source');
    if (source) {
      const card = cards.find(c => c.id === source);
      if (!card) return notFound();
      const [conn, rows] = await Promise.all([getConnection(user.id, source as ConnectorId), sql`select count(*)::int as n from vault_events where user_id = ${user.id} and source = ${source}`]);
      // a connected Shortcut source re-shows its install link + token
      const initialResult: ConnectResult | null = card.mode === 'shortcut' && conn?.status === 'connected' ? await getConnector(source)!.connect(user.id, appOrigin(req)) : null;
      return NextResponse.json({card, connection: conn ? publicConnection(conn) : null, eventCount: Number(rows[0]?.n ?? 0), initialResult});
    }
    const connections = (await listConnections(user.id)).map(publicConnection);
    return NextResponse.json({platform, cards, connections});
  });
}
