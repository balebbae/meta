'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {useTheme} from '@/components/layout/Header';
import {PushToggle} from '@/components/push/PushToggle';
import type {User} from '@/lib/types';
import styles from '@/components/pages/simple.module.css';

export function SettingsScreen({user}: {user: User}) {
  const router = useRouter();
  const {theme, setTheme} = useTheme();
  const [shown, setShown] = useState<'light' | 'dark'>('light');
  useEffect(() => setShown(theme), [theme]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/signout', {method: 'POST'});
    } finally {
      router.push('/auth');
      router.refresh();
    }
  };

  const send = async () => {
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({message: text}),
      });
      if (!res.ok) {
        setNote('Could not send that');
        return;
      }
      setMessage('');
      setNote('Sent. It is in your notifications.');
    } catch {
      setNote('Could not send that');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card} id="help">
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.sub}>{user.name} · {user.email}</p>
        <p className={styles.sub}>Search finds people, posts, groups, marketplace, and events. Voice and video calls work inside a chat. Health sync runs from the phone app.</p>
        <Link href={`/profile/${user.id}`} className={styles.row}>Activity log<span className={styles.hint}>Your profile</span></Link>
        <Link href="/privacy" className={styles.row}>Privacy policy</Link>
        <button type="button" className={styles.row} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          Dark mode
          <span className={styles.hint}>{shown === 'dark' ? 'On' : 'Off'}</span>
        </button>
        <PushToggle />
      </section>
      <section className={styles.card} id="feedback">
        <h2 className={styles.title} style={{fontSize: 20}}>Report a problem</h2>
        <textarea className={styles.field} rows={4} maxLength={1000} placeholder="Tell us what went wrong" value={message} onChange={e => setMessage(e.target.value)} />
        <div className={styles.actions}>
          <button type="button" className="fb-btn-primary" disabled={busy || !message.trim()} onClick={send}>Send</button>
          <button type="button" className="fb-btn-primary" disabled={busy} onClick={logout}>{busy ? 'Logging out…' : 'Log out'}</button>
        </div>
        {note && <p className={styles.note}>{note}</p>}
      </section>
    </div>
  );
}
