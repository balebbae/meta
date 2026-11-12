import Link from 'next/link';
import {Glyph} from '@/components/activities/glyphs';
import {redirect} from 'next/navigation';
import {OnboardingGate} from '@/components/activities/OnboardingGate';
import {SourcesPanel} from '@/components/activities/SourcesPanel';
import {VaultList} from '@/components/activities/VaultList';
import {listConnections, publicConnection} from '@/lib/activities/connections';
import {getPolicies} from '@/lib/activities/policies';
import {museSummary} from '@/lib/activities/summary';
import {listTags} from '@/lib/activities/tags';
import {listVaultEvents} from '@/lib/activities/vault';
import {getSessionUser} from '@/lib/auth';
import styles from '@/components/activities/activities.module.css';

export const dynamic = 'force-dynamic';

export default async function MusePage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const sp = await searchParams;
  const [policies, connections, tags, events] = await Promise.all([getPolicies(user.id), listConnections(user.id), listTags(user.id), listVaultEvents(user.id, {limit: 500})]);
  const connected = connections.filter(c => c.status === 'connected');
  const summary = museSummary(policies, {sources: connected.map(c => c.source.replace('_', ' ')), tags: tags.map(t => t.tag)});
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.source] = (counts[e.source] ?? 0) + 1;
  const museOnlyTags = tags.filter(t => t.visibility === 'muse_only');
  return (
    <main className={styles.page}>
      <OnboardingGate userId={user.id} searchParams={sp} />
      <h1 className={styles.h1}>Your Muse</h1>
      <p className={styles.sub}>Only you can see this page. It is the whole of what your Muse knows about how you move.</p>
      <div className={styles.card} style={{borderTop: '4px solid var(--fb-blue)'}}>
        <h2 className={styles.h2}>What it shares</h2>
        <div className={styles.small} style={{marginBottom: 8}}>
          {summary.headline}
        </div>
        {summary.shares.map(s => (
          <div key={s} className={styles.summaryLine}>
            <span className={styles.glyph}>{Glyph.speak(18)}</span>
            <span>{s}</span>
          </div>
        ))}
        {summary.secrets.map(s => (
          <div key={s} className={styles.summaryLine}>
            <span className={styles.glyph}>{Glyph.secret(18)}</span>
            <span>{s}</span>
          </div>
        ))}
        <div className={styles.summaryLine}>
          <span className={styles.glyph}>{Glyph.nobody(18)}</span>
          <span>{summary.nobody}</span>
        </div>
        <div className={styles.row} style={{marginTop: 10}}>
          <Link href="/activities/privacy" className={styles.btn}>
            Change what it shares
          </Link>
          <Link href="/activities/privacy#audit" className={styles.btnText}>
            Who asked my Muse what
          </Link>
        </div>
      </div>
      <div className={styles.card}>
        <h2 className={styles.h2}>What it knows about you</h2>
        {tags.length > 0 && (
          <div className={styles.chips} style={{marginBottom: 10}}>
            {tags.map(t => (
              <span key={`${t.kind}:${t.tag}`} className={t.visibility === 'muse_only' ? styles.chipMuted : styles.chip} style={{cursor: 'default'}}>
                {t.tag}
                <span className={styles.small}>· {t.visibility === 'muse_only' ? 'Muse-only' : t.visibility}</span>
              </span>
            ))}
          </div>
        )}
        {museOnlyTags.length > 0 && <p className={styles.small}>Muse-only tags shape your targets and are never shown to anyone, including as a reason for a handicap.</p>}
        <h2 className={styles.h2} style={{marginTop: 12}}>
          Vault ({events.length} events)
        </h2>
        <VaultList events={events} />
      </div>
      <SourcesPanel connections={connections.map(publicConnection)} counts={counts} />
    </main>
  );
}
