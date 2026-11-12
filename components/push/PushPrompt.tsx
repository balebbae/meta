'use client';
import {useEffect, useState} from 'react';
import {BellIcon, CloseIcon} from '@/components/icons';
import {promptDecidedKey} from './push-client';
import {usePush} from './usePush';
import styles from './push.module.css';

/**
 * Facebook-style "Turn on notifications" card shown once per user until they decide.
 * Decision is remembered in localStorage (`fb.push.prompt.<userId>`).
 */
export function PushPrompt({userId}: {userId: number}) {
  const {status, busy, enable} = usePush();
  const [decided, setDecided] = useState(true);
  const [result, setResult] = useState<'denied' | 'needs-install' | 'failed' | null>(null);

  useEffect(() => {
    try {
      setDecided(localStorage.getItem(promptDecidedKey(userId)) !== null);
    } catch {
      setDecided(false);
    }
  }, [userId]);

  const remember = (value: string) => {
    try {
      localStorage.setItem(promptDecidedKey(userId), value);
    } catch {}
    setDecided(true);
  };

  if (decided) return null;
  if (status === 'loading' || status === 'unsupported' || status === 'denied' || status === 'subscribed') return null;

  if (result === 'denied' || result === 'needs-install' || result === 'failed' || status === 'needs-install') {
    const kind = result ?? 'needs-install';
    const copy =
      kind === 'denied'
        ? {title: 'Notifications are blocked', body: 'Allow notifications for this site in your browser settings to get notified about new messages.'}
        : kind === 'needs-install'
          ? {title: 'Add Facebook to your Home Screen', body: 'On iPhone and iPad, notifications work after you install the app: tap Share, then "Add to Home Screen", and turn them on from there.'}
          : {title: "Couldn't turn on notifications", body: 'Something went wrong. You can try again from Display & accessibility in your account menu.'};
    return (
      <div className={styles.prompt} role="dialog" aria-label={copy.title}>
        <div className={styles.promptRow}>
          <span className={`${styles.bell} ${styles.bellMuted}`}>
            <BellIcon size={20} />
          </span>
          <div className={styles.promptText}>
            <div className={styles.promptTitle}>{copy.title}</div>
            <div className={styles.promptBody}>{copy.body}</div>
          </div>
          <button className={styles.closeBtn} aria-label="Close" onClick={() => remember(kind)}>
            <CloseIcon size={20} />
          </button>
        </div>
        <div className={styles.promptActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => remember(kind)}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const turnOn = async () => {
    const next = await enable();
    if (next === 'subscribed') remember('on');
    else if (next === 'denied') setResult('denied');
    else if (next === 'needs-install') setResult('needs-install');
    else if (next === 'prompt') remember('dismissed');
    else setResult('failed');
  };

  return (
    <div className={styles.prompt} role="dialog" aria-label="Turn on notifications">
      <div className={styles.promptRow}>
        <span className={styles.bell}>
          <BellIcon size={20} />
        </span>
        <div className={styles.promptText}>
          <div className={styles.promptTitle}>Turn on notifications</div>
          <div className={styles.promptBody}>Get notified about new messages, friend requests and reactions, even when Facebook is closed.</div>
        </div>
        <button className={styles.closeBtn} aria-label="Close" onClick={() => remember('dismissed')}>
          <CloseIcon size={20} />
        </button>
      </div>
      <div className={styles.promptActions}>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => remember('dismissed')} disabled={busy}>
          Not now
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={turnOn} disabled={busy}>
          {busy ? 'Turning on…' : 'Turn on'}
        </button>
      </div>
    </div>
  );
}
