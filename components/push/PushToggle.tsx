'use client';
import {useState} from 'react';
import {BellIcon} from '@/components/icons';
import {usePush} from './usePush';
import styles from './push.module.css';

/** "Push notifications" switch for the account menu (Display & accessibility) or any settings list. */
export function PushToggle() {
  const {status, busy, enable, disable, sendTest} = usePush();
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const on = status === 'subscribed';
  const disabled = busy || status === 'loading' || status === 'unsupported' || status === 'denied' || status === 'needs-install';

  const hint =
    status === 'unsupported'
      ? 'Not supported in this browser.'
      : status === 'needs-install'
        ? 'On iPhone, add Facebook to your Home Screen first (Share > Add to Home Screen).'
        : status === 'denied'
          ? 'Blocked in your browser. Allow notifications for this site in its settings.'
          : on
            ? 'You get notified about new messages on this device.'
            : 'Get notified about new messages, even when Facebook is closed.';

  const flip = async () => {
    setTestMsg(null);
    if (on) await disable();
    else await enable();
  };

  const test = async () => {
    setTestMsg('Sending…');
    try {
      const r = await sendTest();
      setTestMsg(r.ok ? 'Sent. Check your notifications.' : r.error ?? "Couldn't send.");
    } catch {
      setTestMsg("Couldn't send.");
    }
  };

  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleIcon}>
        <BellIcon size={20} />
      </span>
      <span className={styles.toggleText}>
        <div>Push notifications</div>
        <div className={styles.toggleHint}>{hint}</div>
        {on && (
          <div className={styles.toggleLinks}>
            <button className={styles.toggleLink} onClick={test} disabled={busy}>
              Send a test notification
            </button>
            {testMsg && <span className={styles.toggleHint}>{testMsg}</span>}
          </div>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Push notifications"
        className={`${styles.switch} ${on ? styles.switchOn : ''}`}
        onClick={flip}
        disabled={disabled}
      />
    </div>
  );
}
