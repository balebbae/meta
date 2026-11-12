'use client';
import {useRef, useState} from 'react';
import {AVATAR_BOX, fileToDataUrl} from '@/lib/image-upload';
import styles from '@/components/auth/auth.module.css';

const PLACEHOLDER = '/auth/default-avatar.png';

/** Step shown right after sign-up: pick a photo (resized in the browser to a 320px JPEG data URL), then Save or Skip. */
export function ProfilePictureDialog({name, onDone}: {name: string; onDone: () => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      setDataUrl(await fileToDataUrl(file, AVATAR_BOX));
    } catch (err) {
      setDataUrl(null);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try another photo.');
    }
  }

  async function save() {
    if (!dataUrl) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({avatarUrl: dataUrl})});
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {error?: string};
        throw new Error(data.error ?? 'Could not save your profile picture. Please try again.');
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile picture. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="pfp-title">
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle} id="pfp-title">
            Add a profile picture
          </h2>
        </div>
        <div className={styles.dialogBody}>
          <p className={styles.dialogSubtitle}>Add a profile picture so your friends know it&rsquo;s you. Everyone will be able to see your picture.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.pfpPreview} src={dataUrl ?? PLACEHOLDER} alt={dataUrl ? 'Profile picture preview' : ''} width={168} height={168} />
          <div className={styles.pfpName}>{name}</div>
          <button type="button" className={styles.uploadBtn} onClick={() => input.current?.click()}>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M10 2a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H3a1 1 0 1 1 0-2h6V3a1 1 0 0 1 1-1z" />
            </svg>
            {dataUrl ? 'Choose another photo' : 'Upload photo'}
          </button>
          <input ref={input} className={styles.hiddenInput} type="file" accept="image/*" aria-label="Upload photo" onChange={onFile} />
          {error ? (
            <p className={styles.dialogError} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className={styles.dialogFooter}>
          <button type="button" className={styles.skipBtn} onClick={onDone} disabled={busy}>
            Skip
          </button>
          <button type="button" className={styles.saveBtn} onClick={save} disabled={!dataUrl || busy}>
            {busy ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
