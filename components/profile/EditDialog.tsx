'use client';

import {useEffect, useRef, useState} from 'react';
import {AVATAR_BOX, COVER_BOX, fileToDataUrl} from '@/lib/image-upload';
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

const isImageSrc = (v: string) => /^https?:\/\/\S+$/i.test(v) || v.startsWith('data:image/') || v.startsWith('/');

/**
 * Facebook-style centred modal. `bio` edits text; `avatar` / `cover` upload a photo that is resized in the
 * browser (320x320 / 1500x600 JPEG) and saved as a base64 data URL.
 */
export function EditDialog({title, label, initial, kind, hint, onClose, onSave}: Props) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isPhoto = kind !== 'bio';

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      setValue(await fileToDataUrl(file, kind === 'cover' ? COVER_BOX : AVATAR_BOX));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try another photo.');
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = value.trim();
  const showPreview = isPhoto && isImageSrc(trimmed);
  const canSave = !saving && trimmed !== initial.trim() && (kind === 'bio' ? trimmed.length <= 101 : kind === 'cover' ? trimmed === '' || isImageSrc(trimmed) : isImageSrc(trimmed));

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
          {isPhoto ? (
            <>
              <div className={`${styles.preview} ${kind === 'cover' ? styles.previewCover : styles.previewAvatar}`} style={{marginTop: 0}} aria-label={label}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {showPreview && <img src={trimmed} alt="Preview" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />}
              </div>
              <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16}}>
                <button type="button" className="fb-btn-secondary" onClick={() => fileInput.current?.click()} style={{background: 'rgba(8, 102, 255, 0.1)', color: 'var(--fb-blue)'}}>
                  + Upload photo
                </button>
                {kind === 'cover' && trimmed && (
                  <button type="button" className="fb-btn-secondary" onClick={() => setValue('')}>
                    Remove
                  </button>
                )}
              </div>
              <input ref={fileInput} type="file" accept="image/*" hidden aria-label="Upload photo" onChange={onFile} />
            </>
          ) : (
            <>
              <div className={styles.field}>
                <label htmlFor="edit-dialog-input">{label}</label>
                <textarea id="edit-dialog-input" rows={3} value={value} maxLength={101} autoFocus onChange={e => setValue(e.target.value)} placeholder="Describe who you are" />
              </div>
              <div className={styles.fieldCounter}>{101 - value.length} characters remaining</div>
            </>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
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
