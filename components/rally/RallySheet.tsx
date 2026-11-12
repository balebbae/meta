'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {TurfCreateForm} from '@/components/turf/TurfCreateForm';
import {rallyApi} from './api';
import styles from './rally.module.css';

const EXAMPLES = ['Make us do planks every day this week', '30 squats a day, loser buys coffee', 'Relay: run 2 km each before Sunday'];

/** Rally library (§16.1): Turf (handled by /api/games, subagent D) and "Quest from a sentence". */
export function RallySheet({conversationId, viewerId, open, onClose}: {conversationId: number; viewerId?: number; open: boolean; onClose: () => void}) {
  const router = useRouter();
  const [mode, setMode] = useState<'library' | 'sentence' | 'turf'>('library');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const close = () => {
    setMode('library');
    setText('');
    setError(null);
    onClose();
  };
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const {quest, museUsed} = await rallyApi.fromSentence(text, conversationId);
      setOffline(!museUsed);
      close();
      router.push(`/activities/games/${quest.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the quest');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title={mode === 'library' ? 'Rally' : mode === 'turf' ? 'Start Turf' : 'Quest from a sentence'} width={mode === 'turf' ? 540 : 460} onBack={mode !== 'library' ? () => setMode('library') : undefined}>
      {mode === 'library' ? (
        <div className={styles.library}>
          <button type="button" className={styles.libItem} onClick={() => setMode('sentence')}>
            <span className={styles.libIcon} aria-hidden>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 5.2L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-.8z" /></svg>
            </span>
            <span>
              <strong>Quest from a sentence</strong>
              <small>Type what the squad should do; the Muse turns it into a week-long boss fight.</small>
            </span>
          </button>
          <button type="button" className={styles.libItem} onClick={() => setMode('turf')}>
            <span className={styles.libIcon} aria-hidden>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-8-8 18-2-8z" /></svg>
            </span>
            <span>
              <strong>Turf</strong>
              <small>Claim city blocks with your walks and runs. Starts a Turf game for this chat.</small>
            </span>
          </button>
          <p className={styles.sheetMeta}>Quests from Reels: tap “Rally this” on a fitness Reel.</p>
          {offline && <span className={styles.offline}>Muse offline · template quest</span>}
        </div>
      ) : mode === 'turf' ? (
        <TurfCreateForm conversationId={conversationId} viewerId={viewerId} onCreated={close} />
      ) : (
        <div className={styles.sheetForm}>
          <textarea className={styles.textarea} rows={3} maxLength={300} value={text} onChange={e => setText(e.target.value)} placeholder={EXAMPLES[0]} aria-label="Describe the quest" />
          <div className={styles.chips}>
            {EXAMPLES.map(x => (
              <button key={x} type="button" className={styles.chip} onClick={() => setText(x)}>
                {x}
              </button>
            ))}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="button" className="fb-btn-primary" disabled={busy || text.trim().length < 3} onClick={() => void create()}>
            {busy ? 'Designing the quest…' : 'Start quest'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
