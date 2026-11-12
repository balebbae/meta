'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import styles from './profile.module.css';
import {CloseIcon} from './icons';

type Props = {
  title: string;
  label: string;
  initial: string;
  kind: 'bio' | 'cover' | 'avatar';
  hint?: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
};

const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);

/** Facebook-style centred modal with a single field, live preview for image URLs, and Cancel / Save. */
export function EditDialog({title, label, initial, kind, hint, onClose, onSave}: Props) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = value.trim();
  const showPreview = kind !== 'bio' && isUrl(trimmed);
  const canSave = !saving && trimmed !== initial.trim() && (kind === 'bio' ? trimmed.length <= 101 : kind === 'cover' ? trimmed === '' || isUrl(trimmed) : isUrl(trimmed));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={e => e.target === e.currentTarget && onClose()} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
        <div className={styles.dialogHead}>
          <h2 id="edit-dialog-title">{title}</h2>
          <button type="button" className={styles.dialogClose} onClick={onClose} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className={styles.dialogBody}>
          {hint && <p className={styles.dialogHint}>{hint}</p>}
          <div className={styles.field}>
            <label htmlFor="edit-dialog-input">{label}</label>
            {kind === 'bio' ? (
              <textarea id="edit-dialog-input" rows={3} value={value} maxLength={101} autoFocus onChange={e => setValue(e.target.value)} placeholder="Describe who you are" />
            ) : (
              <input id="edit-dialog-input" type="url" value={value} autoFocus onChange={e => setValue(e.target.value)} placeholder="https://" />
            )}
          </div>
          {kind === 'bio' && <div className={styles.fieldCounter}>{101 - value.length} characters remaining</div>}
          {showPreview && (
            <div className={`${styles.preview} ${kind === 'cover' ? styles.previewCover : styles.previewAvatar}`}>
              <Image src={trimmed} alt="" fill sizes="520px" unoptimized />
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.dialogFoot}>
          <button type="button" className="fb-btn-secondary" onClick={onClose} style={{background: 'transparent', color: 'var(--fb-blue)'}}>
            Cancel
          </button>
          <button type="button" className="fb-btn-primary" onClick={save} disabled={!canSave} style={{minWidth: 100, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'default'}}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
