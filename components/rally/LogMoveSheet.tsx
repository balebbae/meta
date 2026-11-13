'use client';
import {useRef, useState} from 'react';
import {Dialog} from '@/components/ui/Dialog';
import {fileToDataUrl, rallyApi, type OkMove} from './api';
import {ClipProof, type ClipPayload} from './ClipProof';
import styles from './rally.module.css';

type Dare = {id: string; text: string; bonus: number; needsProof: boolean};

/**
 * Minimal manual log for a move or a dare. (Subagent A's LogWorkoutSheet can replace the inner form later.)
 * Only what the player types leaves this sheet; the server scores it and posts the public card.
 */
export function LogMoveSheet({questId, open, onClose, dare, levelName, exercises, target, onDone}: {questId: number; open: boolean; onClose: () => void; dare?: Dare | null; levelName?: string; exercises?: string[]; target?: number | null; onDone?: (r: OkMove) => void}) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OkMove | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setNote('');
    setAmount('');
    setImage(null);
    setClip(null);
    setError(null);
    setResult(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = dare ? await rallyApi.dare(questId, dare.id, {image, note}) : await rallyApi.move(questId, clip ? {source: 'clip', note, clip, amount: amount ? Number(amount) : null} : {source: image ? 'photo' : 'manual', note, image, amount: amount ? Number(amount) : null});
      setResult(r);
      onDone?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log the move');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title={dare ? 'Do a dare' : 'Log a move'} width={440}>
      {result ? (
        <div className={styles.sheetResult}>
          <div className={styles.sheetDamage}>{result.critical ? 'CRITICAL ' : ''}−{result.damage} HP</div>
          <p className={styles.sheetNarration}>{result.narration}</p>
          {result.proof && <p className={styles.sheetMeta}>Proof: {result.proof.status} · {result.proof.verdict}</p>}
          {!result.museUsed && <span className={styles.offline}>Muse offline · template narration</span>}
          <button type="button" className="fb-btn-primary" onClick={close} style={{marginTop: 12}}>
            Done
          </button>
        </div>
      ) : (
        <div className={styles.sheetForm}>
          {dare ? (
            <p className={styles.sheetLead}>
              {dare.text} <strong>+{dare.bonus} bonus</strong>
              {dare.needsProof && <span className={styles.sheetMeta}> · photo required</span>}
            </p>
          ) : (
            <p className={styles.sheetLead}>
              {levelName ? <strong>{levelName}: </strong> : null}
              {exercises?.join(', ') || 'Any workout counts.'}
              {target != null && <span className={styles.sheetMeta}> · your target today: {target} (scaled to your recent weeks)</span>}
            </p>
          )}
          {!dare && (
            <label className={styles.field}>
              <span>How much did you do? (reps, seconds or minutes)</span>
              <input type="number" inputMode="numeric" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 45" />
            </label>
          )}
          <label className={styles.field}>
            <span>Note for the squad (optional)</span>
            <input type="text" maxLength={120} value={note} onChange={e => setNote(e.target.value)} placeholder="Done before coffee" />
          </label>
          {!dare && !image && <ClipProof exercises={exercises} target={target} onChange={setClip} />}
          {!clip && <div className={styles.proofRow}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Proof preview" className={styles.proofImg} />
            ) : (
              <button type="button" className="fb-btn-secondary" onClick={() => fileRef.current?.click()}>
                Add photo proof (+10% trust)
              </button>
            )}
            {image && (
              <button type="button" className="fb-btn-secondary" onClick={() => setImage(null)}>
                Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => void (e.target.files?.[0] && fileToDataUrl(e.target.files[0]).then(setImage).catch(() => setError('Could not read that image')))} />
          </div>}
          {error && <p className={styles.error}>{error}</p>}
          <button type="button" className="fb-btn-primary" disabled={busy || (dare?.needsProof && !image)} onClick={() => void submit()}>
            {busy ? 'Scoring…' : dare ? 'Complete dare' : 'Hit the boss'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
