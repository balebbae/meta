import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {ConnectorHub} from '@/components/activities/ConnectorHub';
import {getSessionUser} from '@/lib/auth';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {detectPlatform, listConnectorCards} from '@/lib/activities/connectors';
import styles from './connectors.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Connectors | Facebook'};

export default async function ConnectIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const platform = detectPlatform((await headers()).get('user-agent'));
  const connections = (await listConnections(user.id)).map(publicConnection);
  return (
    <main className={styles.page}>
      <h1>Connectors</h1>
      <p className={styles.description}>Connect your apps and devices to bring workouts into your private vault. Manage or disconnect a source any time. Friends only see what you choose to share.</p>
      <section className={styles.sources} aria-label="Apps and devices">
        <ConnectorHub platform={platform} cards={listConnectorCards(platform)} connections={connections} />
      </section>
    </main>
  );
}
