'use client';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {Popover} from '@/components/ui/Popover';
import {Tooltip} from '@/components/ui/Tooltip';
import {PushToggle} from '@/components/push/PushToggle';
import {
  ArrowLeftIcon,
  BellIcon,
  CaretDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  CommentIcon,
  FacebookLogo,
  FriendsIcon,
  WarningIcon,
  GroupsIcon,
  HelpIcon,
  HomeIcon,
  LikeFilledIcon,
  LogoutIcon,
  MarketplaceIcon,
  MenuGridIcon,
  MessengerIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RailAdsIcon,
  RailEventsIcon,
  RailFeedsIcon,
  RailFriendsIcon,
  RailGroupsIcon,
  RailMarketplaceIcon,
  RailMemoriesIcon,
  RailPagesIcon,
  RailSavedIcon,
  RailVideoIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  VideoIcon,
} from '@/components/icons';
import {formatCompactTime} from '@/lib/format';
import {MessengerPanel, useMessengerUnread} from '@/components/layout/MessengerPanel';
import type {Contact, Notification} from '@/lib/queries';
import type {User} from '@/lib/types';
import styles from './layout.module.css';

const TABS = [
  {href: '/', label: 'Home', Icon: HomeIcon},
  {href: '/friends', label: 'Friends', Icon: FriendsIcon},
  {href: '/video', label: 'Video', Icon: VideoIcon},
  {href: '/marketplace', label: 'Marketplace', Icon: MarketplaceIcon},
  {href: '/groups', label: 'Groups', Icon: GroupsIcon},
];

type Panel = 'menu' | 'messenger' | 'notifications' | 'account' | null;

export function Header({user, contacts = []}: {user: User; contacts?: Contact[]}) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<Panel>(null);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useMessengerUnread();
  const toggle = (p: Panel) => setPanel(cur => (cur === p ? null : p));

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then((d: {unreadCount: number} | null) => d && setUnread(d.unreadCount))
      .catch(() => {});
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/" className={styles.logo} aria-label="Facebook">
          <FacebookLogo size={40} />
        </Link>
        <SearchBox />
      </div>

      <nav className={styles.tabs} aria-label="Primary">
        {TABS.map(({href, label, Icon}) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Tooltip key={href} label={label}>
              <Link href={href} className={`${styles.tab} ${active ? styles.tabActive : ''}`} aria-current={active ? 'page' : undefined}>
                <span className={styles.tabInner}>
                  <Icon size={28} active={active} />
                </span>
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      <div className={styles.right}>
        <div className={styles.iconBtnWrap}>
          <Tooltip label="Menu">
            <button className={`${styles.iconBtn} ${panel === 'menu' ? styles.iconBtnActive : ''}`} onClick={() => toggle('menu')} aria-label="Menu" aria-expanded={panel === 'menu'}>
              <MenuGridIcon size={20} />
            </button>
          </Tooltip>
          <Popover open={panel === 'menu'} onClose={() => setPanel(null)} width={360}>
            <MenuPanel />
          </Popover>
        </div>
        <div className={styles.iconBtnWrap}>
          <Tooltip label="Messenger">
            <button className={`${styles.iconBtn} ${panel === 'messenger' ? styles.iconBtnActive : ''}`} onClick={() => toggle('messenger')} aria-label="Messenger" aria-expanded={panel === 'messenger'}>
              <MessengerIcon size={20} />
              {chatUnread > 0 && <span className={styles.badge}>{chatUnread > 9 ? '9+' : chatUnread}</span>}
            </button>
          </Tooltip>
          <Popover open={panel === 'messenger'} onClose={() => setPanel(null)} width={360}>
            <MessengerPanel open={panel === 'messenger'} viewerId={user.id} onUnread={setChatUnread} onNavigate={() => setPanel(null)} />
          </Popover>
        </div>
        <div className={styles.iconBtnWrap}>
          <Tooltip label="Notifications">
            <button className={`${styles.iconBtn} ${panel === 'notifications' ? styles.iconBtnActive : ''}`} onClick={() => toggle('notifications')} aria-label="Notifications" aria-expanded={panel === 'notifications'}>
              <BellIcon size={20} />
              {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
            </button>
          </Tooltip>
          <Popover open={panel === 'notifications'} onClose={() => setPanel(null)} width={360}>
            <NotificationsPanel open={panel === 'notifications'} onUnread={setUnread} />
          </Popover>
        </div>
        <div className={styles.iconBtnWrap}>
          <Tooltip label="Account">
            <button className={styles.avatarBtn} onClick={() => toggle('account')} aria-label="Your profile" aria-expanded={panel === 'account'}>
              <Avatar src={user.avatarUrl} alt={user.name} size={40} />
              <span className={styles.avatarCaret}>
                <CaretDownIcon size={12} />
              </span>
            </button>
          </Tooltip>
          <Popover open={panel === 'account'} onClose={() => setPanel(null)} width={360}>
            <AccountPanel user={user} />
          </Popover>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Search ---------------- */
const RECENT_KEY = 'fb.recentSearches';

function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [recent, setRecent] = useState<Contact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'));
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(term)}`, {signal: ctrl.signal})
        .then(r => (r.ok ? r.json() : {users: []}))
        .then((d: {users: Contact[]}) => setResults(d.users))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (c: Contact) => {
    const next = [c, ...recent.filter(r => r.id !== c.id)].slice(0, 6);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setOpen(false);
    setQ('');
    router.push(`/profile/${c.id}`);
  };
  const removeRecent = (id: number) => {
    const next = recent.filter(r => r.id !== id);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const list = q.trim() ? results : recent;

  return (
    <>
      <div className={styles.search} onClick={() => setOpen(true)} role="search">
        <SearchIcon size={16} />
        <input placeholder="Search Facebook" aria-label="Search Facebook" value={q} onChange={e => setQ(e.target.value)} onFocus={() => setOpen(true)} />
      </div>
      {open && (
        <div className={styles.searchPanel} ref={panelRef}>
          <div className={styles.searchPanelTop}>
            <button className={styles.backBtn} onClick={() => setOpen(false)} aria-label="Close search">
              <ArrowLeftIcon size={20} />
            </button>
            <div className={styles.search} style={{flex: 1}}>
              <input ref={inputRef} autoFocus placeholder="Search Facebook" aria-label="Search Facebook" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </div>
          {!q.trim() && (
            <div className={styles.searchHeading}>
              <span>Recent</span>
              {recent.length > 0 && <button onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}>Edit</button>}
            </div>
          )}
          {list.length === 0 && <div className={styles.searchEmpty}>{q.trim() ? 'No results found' : 'No recent searches'}</div>}
          {list.map(c => (
            <div key={c.id} className={styles.searchRow} role="button" tabIndex={0} onClick={() => pick(c)} onKeyDown={e => e.key === 'Enter' && pick(c)}>
              {q.trim() ? <Avatar src={c.avatarUrl} alt="" size={36} /> : <span className={styles.searchRowIcon}><ClockIcon size={18} /></span>}
              <span className={styles.searchRowText}>
                {c.name}
                {q.trim() && <div className={styles.searchRowSub}>Friend</div>}
              </span>
              {!q.trim() && (
                <button className={styles.rrIconBtn} aria-label="Remove" onClick={e => { e.stopPropagation(); removeRecent(c.id); }}>
                  <CloseIcon size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Menu (grid) ---------------- */
const MENU_ITEMS = [
  {label: 'Friends', Icon: RailFriendsIcon, href: '/friends'},
  {label: 'Memories', Icon: RailMemoriesIcon, href: '/memories'},
  {label: 'Saved', Icon: RailSavedIcon, href: '/saved'},
  {label: 'Groups', Icon: RailGroupsIcon, href: '/groups'},
  {label: 'Video', Icon: RailVideoIcon, href: '/video'},
  {label: 'Marketplace', Icon: RailMarketplaceIcon, href: '/marketplace'},
  {label: 'Feeds', Icon: RailFeedsIcon, href: '/feeds'},
  {label: 'Events', Icon: RailEventsIcon, href: '/events'},
  {label: 'Ads Manager', Icon: RailAdsIcon, href: '/ads'},
  {label: 'Pages', Icon: RailPagesIcon, href: '/pages'},
];

function MenuPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Menu</div>
      <div className={styles.msgSearch}>
        <SearchIcon size={16} />
        <input placeholder="Search menu" aria-label="Search menu" />
      </div>
      <div className={styles.panelSub}>Social</div>
      <div className={styles.menuGrid}>
        {MENU_ITEMS.map(({label, Icon, href}) => (
          <Link key={label} href={href} className={styles.menuTile}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <div className={styles.panelSub}>Create</div>
      {[
        {label: 'Post', Icon: PencilIcon},
        {label: 'Story', Icon: PlusIcon},
        {label: 'Group', Icon: UsersIcon},
        {label: 'Event', Icon: RailEventsIcon},
      ].map(({label, Icon}) => (
        <button key={label} className={styles.menuRow}>
          <span className={styles.menuIcon}>
            <Icon size={20} />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsPanel({open, onUnread}: {open: boolean; onUnread: (n: number) => void}) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!open) return;
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then((d: {notifications: Notification[]; unreadCount: number} | null) => {
        if (!d) return;
        setItems(d.notifications);
        onUnread(d.unreadCount);
      })
      .catch(() => {});
  }, [open, onUnread]);

  const markRead = async (ids: number[] | 'all') => {
    setItems(list =>
      list?.map(n => (ids === 'all' || ids.includes(n.id) ? {...n, isRead: true} : n)) ?? null,
    );
    const remaining = (items ?? []).filter(n => !n.isRead && !(ids === 'all' || ids.includes(n.id))).length;
    onUnread(remaining);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(ids === 'all' ? {all: true} : {ids}),
    });
  };

  const shown = (items ?? []).filter(n => filter === 'all' || !n.isRead);
  const DAY = 24 * 60 * 60 * 1000;
  const isNew = (n: Notification) => Date.now() - new Date(n.createdAt).getTime() < DAY;
  const fresh = shown.filter(isNew);
  const earlier = shown.filter(n => !isNew(n));
  const respond = async (n: Notification, accept: boolean) => {
    if (!n.actor) return;
    setItems(list => list?.filter(x => x.id !== n.id) ?? null);
    markRead([n.id]);
    try {
      if (accept) await fetch('/api/friends/accept', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId: n.actor.id})});
      else await fetch(`/api/friends/${n.actor.id}`, {method: 'DELETE'});
    } catch {}
  };
  const row = (n: Notification) => (
    <Link key={n.id} href={n.postId ? `/?post=${n.postId}` : n.actor ? `/profile/${n.actor.id}` : '/'} className={styles.notif} onClick={() => !n.isRead && markRead([n.id])}>
      <span className={styles.notifAvatar}>
        <Avatar src={n.actor?.avatarUrl ?? '/icon.svg'} alt="" size={56} />
        <span className={styles.notifType} style={{background: n.type === 'reaction' ? 'var(--fb-blue)' : n.type === 'comment' ? '#31a24c' : n.type === 'friend_request' ? 'var(--fb-blue)' : '#65676b'}}>
          {n.type === 'comment' ? <CommentIcon size={14} /> : n.type === 'friend_request' ? <UsersIcon size={14} /> : n.type === 'reaction' ? <LikeFilledIcon size={14} /> : <BellIcon size={14} />}
        </span>
      </span>
      <span className={styles.notifBody}>
        <div className={styles.notifMsg}>{n.message}</div>
        <div className={`${styles.notifTime} ${!n.isRead ? styles.notifTimeUnread : ''}`}>{formatCompactTime(n.createdAt)}</div>
        {n.type === 'friend_request' && n.actor && (
          <div className={styles.notifActions}>
            <button className={styles.frConfirm} onClick={e => { e.preventDefault(); respond(n, true); }}>
              Confirm
            </button>
            <button className={styles.frDelete} onClick={e => { e.preventDefault(); respond(n, false); }}>
              Delete
            </button>
          </div>
        )}
      </span>
      {!n.isRead && <span className={styles.notifDot} />}
    </Link>
  );
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>Notifications</div>
        <button className={styles.rrIconBtn} aria-label="Mark all as read" title="Mark all as read" onClick={() => markRead('all')}>
          <MoreHorizontalIcon size={20} />
        </button>
      </div>
      <div className={styles.chipRow}>
        <button className={`${styles.chip} ${filter === 'all' ? styles.chipActive : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button className={`${styles.chip} ${filter === 'unread' ? styles.chipActive : ''}`} onClick={() => setFilter('unread')}>
          Unread
        </button>
      </div>
      {items === null && <div className={styles.searchEmpty}>Loading…</div>}
      {items !== null && shown.length === 0 && <div className={styles.searchEmpty}>You&apos;re all caught up</div>}
      {fresh.length > 0 && (
        <div className={styles.notifSection}>
          <span>New</span>
          <Link href="/friends" className={styles.linkBtn}>
            See all
          </Link>
        </div>
      )}
      {fresh.map(row)}
      {earlier.length > 0 && (
        <div className={styles.notifSection}>
          <span>Earlier</span>
          {fresh.length === 0 && (
            <Link href="/friends" className={styles.linkBtn}>
              See all
            </Link>
          )}
        </div>
      )}
      {earlier.map(row)}
    </div>
  );
}

/* ---------------- Account ---------------- */
type AcctView = 'root' | 'settings' | 'help' | 'display' | 'feedback';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    setThemeState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);
  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem('fb.theme', t);
  };
  return {theme, setTheme};
}

function AccountPanel({user}: {user: User}) {
  const router = useRouter();
  const [view, setView] = useState<AcctView>('root');
  const {theme, setTheme} = useTheme();

  const logout = async () => {
    try {
      await fetch('/api/auth/signout', {method: 'POST'});
    } finally {
      router.push('/auth');
      router.refresh();
    }
  };

  if (view !== 'root') {
    const titles: Record<AcctView, string> = {root: '', settings: 'Settings & privacy', help: 'Help & support', display: 'Display & accessibility', feedback: 'Report a problem'};
    return (
      <div className={styles.panel}>
        <div className={styles.chatHead} style={{borderBottom: 0}}>
          <button className={styles.backBtn} onClick={() => setView('root')} aria-label="Back">
            <ArrowLeftIcon size={20} />
          </button>
          <div className={styles.panelTitle} style={{padding: 0}}>{titles[view]}</div>
        </div>
        {view === 'display' && (
          <>
            <div className={styles.menuRow} style={{alignItems: 'flex-start'}}>
              <span className={styles.menuIcon}>
                <MoonIcon size={20} />
              </span>
              <span className={styles.grow}>
                <div>Dark mode</div>
                <div className={styles.footerNote} style={{padding: '2px 0 0', fontWeight: 400}}>
                  Adjust the appearance of Facebook to reduce glare and give your eyes a break.
                </div>
              </span>
            </div>
            <button className={styles.toggle} onClick={() => setTheme('light')}>
              <span>Off</span>
              <span className={`${styles.radio} ${theme === 'light' ? styles.radioOn : ''}`} />
            </button>
            <button className={styles.toggle} onClick={() => setTheme('dark')}>
              <span>On</span>
              <span className={`${styles.radio} ${theme === 'dark' ? styles.radioOn : ''}`} />
            </button>
            <PushToggle />
          </>
        )}
        {view === 'settings' &&
          ['Settings', 'Privacy Checkup', 'Privacy Center', 'Activity log', 'Feed', 'Language'].map(l => (
            <button key={l} className={styles.menuRow}>
              <span className={styles.menuIcon}>
                <SettingsIcon size={20} />
              </span>
              {l}
            </button>
          ))}
        {view === 'help' &&
          ['Help Center', 'Account status', 'Support Inbox', 'Report a problem'].map(l => (
            <button key={l} className={styles.menuRow}>
              <span className={styles.menuIcon}>
                <HelpIcon size={20} />
              </span>
              {l}
            </button>
          ))}
        {view === 'feedback' && (
          <div style={{padding: 8}}>
            <textarea className={styles.imageUrlInput} style={{width: '100%', height: 100, padding: 8, borderRadius: 8, border: '1px solid var(--fb-divider)', background: 'transparent', color: 'inherit'}} placeholder="Tell us what you think (demo only)" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.acctCard}>
        <Link href={`/profile/${user.id}`} className={styles.acctRow}>
          <Avatar src={user.avatarUrl} alt="" size={36} />
          {user.name}
        </Link>
        <div className={styles.acctDivider} />
        <button className={styles.acctAll}>See all profiles</button>
      </div>
      {(
        [
          {v: 'settings', label: 'Settings & privacy', Icon: SettingsIcon},
          {v: 'help', label: 'Help & support', Icon: HelpIcon},
          {v: 'feedback', label: 'Report a problem', Icon: WarningIcon},
          {v: 'display', label: 'Display & accessibility', Icon: MoonIcon},
        ] as const
      ).map(({v, label, Icon}) => (
        <button key={v} className={styles.menuRow} onClick={() => setView(v)}>
          <span className={styles.menuIcon}>
            <Icon size={20} />
          </span>
          <span className={styles.grow}>
            {label}
            {v === 'feedback' && <div className={styles.acctHint}>CTRL B</div>}
          </span>
          {v !== 'feedback' && <ChevronRightIcon size={20} />}
        </button>
      ))}
      <button className={styles.menuRow} onClick={logout}>
        <span className={styles.menuIcon}>
          <LogoutIcon size={20} />
        </span>
        Log out
      </button>
      <div className={styles.footerNote}>Privacy · Consumer Health Privacy · Terms · Advertising · Ad Choices ▷ · Cookies · More</div>
    </div>
  );
}
