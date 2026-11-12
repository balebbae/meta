import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {detectPlatform, listConnectorCards} from '@/lib/activities/connectors';

export async function GET(req: Request) {
  return withUser(async user => {
    const platform = detectPlatform(req.headers.get('user-agent'));
    const connections = (await listConnections(user.id)).map(publicConnection);
    return NextResponse.json({platform, cards: listConnectorCards(platform), connections});
  });
}
