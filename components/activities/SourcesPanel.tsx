'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {SOURCE_ICON, type PublicConnection} from './ConnectorHub';
import {sourceLabel} from './VaultList';
import styles from './activities.module.css';

/** Connected sources with "revoke" and "delete vault data" per source (privacy + Muse pages). */
export function SourcesPanel({connections, counts}: {connections: PublicConnection[]; counts: Record<string, number>}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const sources = [...new Set([...connections.filter(c => c.status !== 'revoked').map(c => c.source), ...Object.keys(counts)])];

  async function wipe(source: string) {
    if (!confirm(`Delete all ${sourceLabel(source)} data from your vault?`)) return;
    setBusy(source + ':wipe');
    await fetch(`/api/activities/vault?source=${encodeURIComponent(source)}`, {method: 'DELETE'});
    setBusy(null);
    router.refresh();
  }
  async function revoke(source: string) {
    if (!confirm(`Disconnect ${sourceLabel(source)}? Its data stays in your vault until you delete it.`)) return;
    setBusy(source + ':revoke');
    await fetch(`/api/connect/${source}/disconnect`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({deleteData: false})});
    setBusy(null);
    router.refresh();
  }

  return (
    <div className={styles.card}>
      <div className={styles.between}>
        <h2 className={styles.h2}>Sources</h2>
        <Link href="/activities/onboarding/connect" className={styles.btnText}>
          Add a source
        </Link>
      </div>
      {sources.length === 0 ? (
        <p className={styles.sub}>No sources yet.</p>
      ) : (
        <ul className={styles.list}>
          {sources.map(s => {
            const c = connections.find(x => x.source === s);
            const n = counts[s] ?? 0;
            return (
              <li key={s} className={styles.listItem}>
                <span className={styles.iconBox} aria-hidden>
                  {SOURCE_ICON[s as keyof typeof SOURCE_ICON] ?? '•'}
                </span>
                <div className={styles.grow}>
                  <div className={styles.row} style={{gap: 6}}>
                    <span className={styles.title}>{sourceLabel(s)}</span>
                    {c?.status === 'connected' && <span className={styles.badgeGreen}>Connected</span>}
                    {c?.status === 'error' && <span className={styles.badgeAmber}>Error</span>}
                  </div>
                  <div className={styles.small}>
                    {n} event{n === 1 ? '' : 's'} in your vault{c?.lastSync ? ` · synced ${new Date(c.lastSync).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div className={styles.row} style={{gap: 2, flexWrap: 'nowrap'}}>
                  {n > 0 && (
                    <button className={styles.btnDanger} disabled={busy != null} onClick={() => void wipe(s)}>
                      {busy === s + ':wipe' ? '…' : 'Delete data'}
                    </button>
                  )}
                  {c?.status === 'connected' && s !== 'manual' && s !== 'proof_photo' && (
                    <button className={styles.btn} disabled={busy != null} onClick={() => void revoke(s)}>
                      {busy === s + ':revoke' ? '…' : 'Revoke'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
