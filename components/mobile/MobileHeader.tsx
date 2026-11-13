'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {ArrowLeftIcon, MessengerIcon, SearchIcon} from '@/components/icons';
import {Avatar} from '@/components/ui/Avatar';
import {COMPOSE_EVENT} from '@/components/layout/ComposeFab';
import {useVisiblePolling} from '@/components/messages/hooks';
import type {AppSearch} from '@/lib/search';
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

const blankSearch: AppSearch = {users: [], posts: [], groups: [], listings: [], events: []};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Search used by the mobile header, menu, and friends title. */
export function PeopleSearchButton({className, iconSize = 22}: {className: string; iconSize?: number}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<AppSearch>(blankSearch);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) {
      setHits(blankSearch);
      setSettled(false);
      return;
    }
    setSettled(false);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, {signal: ctrl.signal})
        .then(r => (r.ok ? r.json() : blankSearch))
        .then((d: AppSearch) => {
          setHits({
            users: d.users ?? [],
            posts: d.posts ?? [],
            groups: d.groups ?? [],
            listings: d.listings ?? [],
            events: d.events ?? [],
          });
          setSettled(true);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setSettled(true);
        });
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, q]);

  const close = () => {
    setOpen(false);
    setQ('');
  };
  const none = settled && hits.users.length + hits.posts.length + hits.groups.length + hits.listings.length + hits.events.length === 0;

  return (
    <>
      <button type="button" className={className} aria-label="Search" onClick={() => setOpen(true)}>
        <SearchIcon size={iconSize} />
      </button>
      {open && (
        <div className={styles.searchSheet} role="dialog" aria-label="Search Facebook">
          <div className={styles.searchSheetTop}>
            <button type="button" className={styles.titleBtn} aria-label="Close search" onClick={close}>
              <ArrowLeftIcon size={20} />
            </button>
            <label className={styles.searchBox} style={{flex: 1, margin: 0}}>
              <SearchIcon size={18} />
              <input autoFocus aria-label="Search Facebook" placeholder="Search Facebook" value={q} onChange={e => setQ(e.target.value)} />
            </label>
          </div>
          <div className={styles.searchSheetList}>
            {hits.users.length > 0 && <div className={styles.searchSection}>People</div>}
            {hits.users.map(u => (
              <Link key={`u${u.id}`} href={`/profile/${u.id}`} className={styles.searchHit} onClick={close}>
                <Avatar src={u.avatarUrl} alt="" size={40} />
                {u.name}
              </Link>
            ))}
            {hits.posts.length > 0 && <div className={styles.searchSection}>Posts</div>}
            {hits.posts.map(p => (
              <Link key={`p${p.id}`} href={`/posts/${p.id}`} className={styles.searchHit} onClick={close}>
                <span>{p.snippet}<span className={styles.profileSub}> {p.authorName}</span></span>
              </Link>
            ))}
            {hits.groups.length > 0 && <div className={styles.searchSection}>Groups</div>}
            {hits.groups.map(g => (
              <Link key={`g${g.id}`} href={`/groups/${g.id}`} className={styles.searchHit} onClick={close}>{g.name}</Link>
            ))}
            {hits.listings.length > 0 && <div className={styles.searchSection}>Marketplace</div>}
            {hits.listings.map(l => (
              <Link key={`l${l.id}`} href={`/marketplace/item/${l.id}`} className={styles.searchHit} onClick={close}>{l.title} · {money(l.priceCents)}</Link>
            ))}
            {hits.events.length > 0 && <div className={styles.searchSection}>Events</div>}
            {hits.events.map(e => (
              <Link key={`e${e.id}`} href="/events" className={styles.searchHit} onClick={close}>{e.title}</Link>
            ))}
            {none && <p className={styles.empty}>No results.</p>}
          </div>
        </div>
      )}
    </>
  );
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
        <PeopleSearchButton className={styles.headerBtn} iconSize={27} />
        <Link href="/messages" className={styles.headerBtn} aria-label="Messenger">
          <MessengerIcon size={28} />
          {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </div>
    </header>
  );
}
