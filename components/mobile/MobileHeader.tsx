'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {MessengerIcon, SearchIcon} from '@/components/icons';
import {COMPOSE_EVENT} from '@/components/layout/ComposeFab';
import {useVisiblePolling} from '@/components/messages/hooks';
import {FacebookWordmark} from './Wordmark';
import styles from './mobile.module.css';

function HamburgerIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
export function CreatePlusIcon({size = 28}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

/** Polls the Messenger unread count while the tab is visible; 0 when the messaging API is unavailable. */
export function useChatUnread(intervalMs = 15000) {
  const [n, setN] = useState(0);
  useVisiblePolling(
    () =>
      fetch('/api/conversations/unread-count', {cache: 'no-store'})
        .then(r => (r.ok ? r.json() : null))
        .then((d: {unreadCount?: number} | null) => setN(Number(d?.unreadCount) || 0))
        .catch(() => setN(0)),
    intervalMs,
  );
  return n;
}

/** Pages that draw their own large title instead of the wordmark header (like the iOS app). */
const SELF_TITLED = ['/menu', '/friends', '/messages'];

export function MobileHeader() {
  const pathname = usePathname();
  const unread = useChatUnread();
  if (SELF_TITLED.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;
  return (
    <header className={`${styles.mobileOnly} ${styles.header}`} aria-label="Facebook">
      <Link href="/menu" className={styles.hamburger} aria-label="Menu">
        <HamburgerIcon />
      </Link>
      <Link href="/" className={styles.wordmark} aria-label="Home">
        <FacebookWordmark height={27} />
      </Link>
      <div className={styles.headerIcons}>
        <button className={styles.headerBtn} aria-label="Create" onClick={() => window.dispatchEvent(new Event(COMPOSE_EVENT))}>
          <CreatePlusIcon size={28} />
        </button>
        <Link href="/friends?view=suggestions" className={styles.headerBtn} aria-label="Search">
          <SearchIcon size={27} />
        </Link>
        <Link href="/messages" className={styles.headerBtn} aria-label="Messenger">
          <MessengerIcon size={28} />
          {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </div>
    </header>
  );
}
