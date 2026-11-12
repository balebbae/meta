'use client';
import {useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {turfApi} from './api';
import styles from './turf.module.css';
import type {TurfState} from '@/lib/turf/types';

/** What is shared and what never is (§10.2). Shown inline on the pending-invite view and in the sheet. */
export function ConsentCopy({title}: {title: string}) {
  return (
    <>
      <p className={styles.consentLead}>
        To play <strong>{title}</strong>, Turf uses your location while you are on an outing. This is per game: saying yes here does not share anything in other games.
      </p>
      <ul className={styles.consentList}>
        <li>
          <i className={styles.yes} aria-hidden>
            ✓
          </i>
          <div>
            <strong>Shared with players in this game</strong>
            <span>The cells you claim inside the arena, and your cell count.</span>
          </div>
        </li>
        <li>
          <i className={styles.no} aria-hidden>
            ✕
          </i>
          <div>
            <strong>Never shared</strong>
            <span>Your route, your live position, where an outing starts or ends (the first and last 200 m are hidden), anything outside the arena, and anything inside your privacy zones.</span>
          </div>
        </li>
        <li>
          <i className={styles.no} aria-hidden>
            ✕
          </i>
          <div>
            <strong>You stay in control</strong>
            <span>Leave at any time and your cells turn neutral. Your GPS points stay in your own vault.</span>
          </div>
        </li>
      </ul>
    </>
  );
}

export function ConsentSheet({gameId, title, open, onClose, onAccepted}: {gameId: number; title: string; open: boolean; onClose: () => void; onAccepted: (s: TurfState) => void}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      onAccepted(await turfApi.respond(gameId, 'accepted', true));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join the game');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Share location for this game?" width={460}>
      <div className={styles.consent}>
        <ConsentCopy title={title} />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            Not now
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => void accept()} disabled={busy}>
            {busy ? 'Joining…' : 'Allow and join'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
