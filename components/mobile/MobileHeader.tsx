'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {ArrowLeftIcon, ChevronLeftIcon, MessengerIcon, MoreCircleIcon, SearchIcon, MobileSearchIcon, HamburgerIcon, CreatePlusIcon} from '@/components/icons';
import {Popover} from '@/components/ui/Popover';
import {CreateGroupDialog} from '@/components/pages/CreateGroupDialog';
import {Avatar} from '@/components/ui/Avatar';
import {COMPOSE_EVENT} from '@/components/layout/ComposeFab';
import {useVisiblePolling} from '@/components/messages/hooks';
import type {AppSearch} from '@/lib/search';
import {FacebookWordmark} from './Wordmark';
import styles from './mobile.module.css';

export const MOBILE_MENU_EVENT = 'fb.mobile-menu';

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
export function PeopleSearchButton({className, iconSize = 22, thin = false}: {className: string; iconSize?: number; thin?: boolean}) {
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
        {thin ? <MobileSearchIcon size={iconSize} /> : <SearchIcon size={iconSize} />}
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
const SELF_TITLED = ['/menu', '/messages'];
const PAGE_TITLES: Record<string, string> = {'/friends': 'Friends', '/marketplace': 'Marketplace', '/notifications': 'Notifications', '/video': 'Video', '/groups': 'Groups'};

export function MobileHeader() {
  const pathname = usePathname();
  const unread = useChatUnread();
  const [more, setMore] = useState(false);
  const [createGroup, setCreateGroup] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setMore(false); setCreateGroup(false); setError(''); }, [pathname]);
  async function markAllRead() {
    setError('');
    try {
      const res = await fetch('/api/notifications', {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({all: true})});
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setError('Could not mark notifications as read. Please try again.');
    }
  }
  if (SELF_TITLED.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;
  const groupDetail = pathname.startsWith('/groups/');
  const title = PAGE_TITLES[pathname] ?? (groupDetail ? 'Groups' : undefined);
  const groups = pathname === '/groups' || groupDetail;
  if (title) return (
    <header className={`${styles.mobileOnly} ${styles.header} ${styles.pageHeader} ${groups ? styles.groupsHeader : ''}`} data-mobile-title={title} aria-label={title}>
      <Link href={groupDetail ? '/groups' : '/menu'} className={styles.hamburger} aria-label={groupDetail ? 'Back to groups' : groups ? 'Back to menu' : 'Menu'} onClick={e => { if (groupDetail) return; e.preventDefault(); window.dispatchEvent(new Event(MOBILE_MENU_EVENT)); }}>
        {groups ? <ChevronLeftIcon size={24} /> : <HamburgerIcon />}
      </Link>
      <h1 className={styles.pageTitle}>{title}</h1>
      <div className={styles.headerIcons}>
        {groups && !groupDetail && <button className={styles.headerBtn} aria-label="Create group" onClick={() => setCreateGroup(true)}><CreatePlusIcon size={25} /></button>}
        {(pathname === '/notifications' || pathname === '/marketplace') && <Link href="/messages" className={styles.headerBtn} aria-label={unread ? `Messenger, ${unread} unread` : 'Messenger'}>
          <MessengerIcon size={24} />
          {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
        </Link>}
        <PeopleSearchButton className={styles.headerBtn} iconSize={25} thin />
        {pathname !== '/friends' && <div className={styles.moreWrap}>
          <button className={styles.headerBtn} aria-label="More options" aria-expanded={more} onClick={() => setMore(v => !v)}><MoreCircleIcon size={24} /></button>
          <Popover open={more} onClose={() => setMore(false)} width={220}>
            {pathname === '/notifications' && <button className={styles.headerOption} onClick={markAllRead}>Mark all as read</button>}
            <Link className={styles.headerOption} href="/settings" onClick={() => setMore(false)}>Settings &amp; privacy</Link>
            <Link className={styles.headerOption} href="/menu" onClick={() => setMore(false)}>Menu</Link>
            {error && <p className={styles.headerOption} role="alert">{error}</p>}
          </Popover>
        </div>}
      </div>
      {groups && <CreateGroupDialog open={createGroup} onClose={() => setCreateGroup(false)} />}
    </header>
  );
  return (
    <header className={`${styles.mobileOnly} ${styles.header} ${pathname === '/' ? styles.homeHeader : ''}`} aria-label="Facebook">
      <Link href="/menu" className={styles.hamburger} aria-label="Menu" onClick={e => { e.preventDefault(); window.dispatchEvent(new Event(MOBILE_MENU_EVENT)); }}>
        <HamburgerIcon />
      </Link>
      <Link href="/" className={styles.wordmark} aria-label="Home">
        <FacebookWordmark height={27} />
      </Link>
      <div className={styles.headerIcons}>
        <button className={styles.headerBtn} aria-label="Create" onClick={() => window.dispatchEvent(new Event(COMPOSE_EVENT))}>
          <CreatePlusIcon size={28} />
        </button>
        <PeopleSearchButton className={styles.headerBtn} iconSize={27} thin />
        <Link href="/messages" className={styles.headerBtn} aria-label="Messenger">
          <MessengerIcon size={28} />
          {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </div>
    </header>
  );
}
