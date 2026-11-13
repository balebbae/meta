import {headers} from 'next/headers';
import {notFound, redirect} from 'next/navigation';
import {ConnectSourcePanel} from '@/components/activities/ConnectSourcePanel';
import {getConnection, publicConnection} from '@/lib/activities/connections';
import {detectPlatform, getConnector, listConnectorCards} from '@/lib/activities/connectors';
import {sql} from '@/lib/db';
import {getSessionUser} from '@/lib/auth';
import {appOrigin} from '@/lib/activities/origin';
import type {ConnectResult, ConnectorId} from '@/lib/activities/types';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';

export const dynamic = 'force-dynamic';

export default async function ConnectSourcePage({params, searchParams}: {params: Promise<{source: string}>; searchParams: Promise<{connected?: string; imported?: string; error?: string}>}) {
  const [{source}, q] = await Promise.all([params, searchParams]);
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const h = await headers();
  const platform = detectPlatform(h.get('user-agent'));
  const card = listConnectorCards(platform).find(c => c.id === source);
  if (!card) notFound();
  const [conn, rows] = await Promise.all([getConnection(user.id, source as ConnectorId), sql`select count(*)::int as n from vault_events where user_id = ${user.id} and source = ${source}`]);
  let initialResult: ConnectResult | null = null;
  if (card.mode === 'shortcut' && conn?.status === 'connected') {
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
    const origin = appOrigin(new Request(`${h.get('x-forwarded-proto') ?? 'http'}://${host}/`, {headers: h}));
    initialResult = await getConnector(source)!.connect(user.id, origin);
  }
  const flash = q.connected ? `Connected${q.imported ? `, imported ${q.imported} workouts` : ''}.` : q.error ? `Connection failed: ${q.error === 'state' ? 'state mismatch, try again' : q.error}` : null;
  return (
    <VStack gap={4} paddingBlock={4}>
      <HStack>
        <Button label="All sources" variant="ghost" size="sm" icon={<Icon icon="chevronLeft" />} href="/activities/onboarding/connect" />
      </HStack>
      <VStack gap={1}>
        <Heading level={1}>{card.label}</Heading>
        <Text color="secondary">Data from this source lands in your private vault. Games and friends only ever get Answers at your chosen precision.</Text>
      </VStack>
      <ConnectSourcePanel card={card} connection={conn ? publicConnection(conn) : null} eventCount={Number(rows[0]?.n ?? 0)} initialResult={initialResult} flash={flash} />
    </VStack>
  );
}
