import Link from 'next/link';
import {headers} from 'next/headers';
import {notFound, redirect} from 'next/navigation';
import {ConnectSourcePanel} from '@/components/activities/ConnectSourcePanel';
import {getConnection, publicConnection} from '@/lib/activities/connections';
import {detectPlatform, getConnector, listConnectorCards} from '@/lib/activities/connectors';
import {sql} from '@/lib/db';
import {getSessionUser} from '@/lib/auth';
import {appOrigin} from '@/lib/activities/origin';
import type {ConnectResult, ConnectorId} from '@/lib/activities/types';
import styles from '@/components/activities/activities.module.css';

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
    <main className={styles.page}>
      <div className={styles.row} style={{marginBottom: 8}}>
        <Link href="/activities/onboarding/connect" className={styles.btnText}>
          ← All sources
        </Link>
      </div>
      <h1 className={styles.h1}>{card.label}</h1>
      <p className={styles.sub}>Data from this source lands in your private vault. Games and friends only ever get Answers at your chosen precision.</p>
      <ConnectSourcePanel card={card} connection={conn ? publicConnection(conn) : null} eventCount={Number(rows[0]?.n ?? 0)} initialResult={initialResult} flash={flash} />
    </main>
  );
}
