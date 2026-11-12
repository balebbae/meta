'use client';
import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {CloseIcon} from '@/components/icons';
import styles from './activities.module.css';

export type IntroInvite = {gameId: number; inviterName: string; gameTitle: string; mode?: string};

/**
 * Activities intro (§8). Default variant explains Rally / Turf / Muse and starts onboarding; the invite
 * variant ("Priya invited you to Turf: Katy Trail") runs the minimal flow (tags → privacy) and lands on the game.
 * Focus-trapped, Esc closes (= Not now), full-height sheet on mobile, fine at 320px.
 */
export function IntroModal({open, invite, onClose}: {open: boolean; invite?: IntroInvite | null; onClose?: () => void}) {
  const router = useRouter();
  const [visible, setVisible] = useState(open);
  const [busy, setBusy] = useState<'start' | 'snooze' | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => setVisible(open), [open]);

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const snooze = useCallback(async () => {
    setBusy('snooze');
    await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'snooze'})}).catch(() => {});
    setBusy(null);
    close();
    router.refresh();
  }, [close, router]);

  const start = useCallback(async () => {
    setBusy('start');
    await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({action: 'start'})}).catch(() => {});
    setBusy(null);
    close();
    router.push(invite ? `/activities/onboarding/tags?invite=${invite.gameId}` : '/activities/onboarding/tags');
  }, [close, invite, router]);

  useEffect(() => {
    if (!visible) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    primary.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        void snooze();
      }
      if (e.key === 'Tab' && box.current) {
        const items = Array.from(box.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [visible, snooze]);

  if (!visible || typeof document === 'undefined') return null;

  const bullets: {icon: string; title: string; body: ReactNode}[] = invite
    ? [
        {icon: '🏁', title: `${invite.gameTitle}`, body: `${invite.inviterName} picked you. Accepting takes two quick steps: what you're into, and what your Muse may share.`},
        {icon: '🔒', title: 'Your data stays yours', body: 'The game only ever sees what you allow. Routes and heart rate never leave your vault unless you say so.'},
        {icon: '🧠', title: 'Your Muse keeps score', body: 'It answers the game\u2019s questions at the precision you choose, and logs every question for you to read.'},
      ]
    : [
        {icon: '🎯', title: 'Rally', body: 'Boss fights, relays and streaks with friends in Messenger. Your Muse scales the targets to each person so nobody is the weak link.'},
        {icon: '🗺️', title: 'Turf', body: 'Claim ground by walking or running real streets. Teams, arenas, trash talk. Phone in pocket.'},
        {icon: '🧠', title: 'Your Muse', body: 'A private agent that knows your workouts, keeps the raw data in your vault, and only tells others what you allow.'},
      ];

  return createPortal(
    <div className={styles.introOverlay} onMouseDown={e => e.target === e.currentTarget && void snooze()}>
      <div ref={box} className={styles.intro} role="dialog" aria-modal="true" aria-labelledby="activities-intro-title" style={{position: 'relative'}}>
        <div className={styles.introHero}>
          <button className={styles.introClose} onClick={() => void snooze()} aria-label="Not now">
            <CloseIcon size={20} />
          </button>
          <h2 id="activities-intro-title">{invite ? `${invite.inviterName} invited you to ${invite.gameTitle}` : 'Activities'}</h2>
          <p>{invite ? 'Join the game in about a minute.' : 'The place where your friends make you move.'}</p>
        </div>
        <div className={styles.introBody}>
          <ul className={styles.introBullets}>
            {bullets.map(b => (
              <li key={b.title}>
                <span aria-hidden style={{fontSize: 22, lineHeight: '28px'}}>
                  {b.icon}
                </span>
                <span>
                  <strong>{b.title}</strong>
                  <span className={styles.muted}>{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.small} style={{marginTop: 14}}>
            No wearable needed: use a photo of your treadmill or just tell your Muse what you did. You can change any sharing choice later under Activities → Privacy.
          </p>
        </div>
        <div className={styles.introFooter}>
          <button ref={primary} className={`${styles.btnPrimary} ${styles.btnFull}`} onClick={() => void start()} disabled={busy != null}>
            {busy === 'start' ? 'Starting…' : invite ? 'Accept and set up' : 'Get started'}
          </button>
          <button className={`${styles.btn} ${styles.btnFull}`} onClick={() => void snooze()} disabled={busy != null}>
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
