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
import {NotificationsPanel} from '@/components/layout/NotificationsPanel';
import type {Contact, Notification} from '@/lib/queries';
import type {AppSearch} from '@/lib/search';
import {COMPOSE_EVENT} from '@/components/layout/ComposeFab';
import {CreateStoryDialog} from '@/components/feed/StoryDialogs';
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
const noHits: AppSearch = {users: [], posts: [], groups: [], listings: [], events: []};

function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AppSearch>(noHits);
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
      setResults(noHits);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, {signal: ctrl.signal})
        .then(r => (r.ok ? r.json() : noHits))
        .then((d: AppSearch) => setResults({users: d.users ?? [], posts: d.posts ?? [], groups: d.groups ?? [], listings: d.listings ?? [], events: d.events ?? []}))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string, person?: Contact) => {
    if (person) {
      const next = [person, ...recent.filter(r => r.id !== person.id)].slice(0, 6);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    }
    setOpen(false);
    setQ('');
    router.push(href);
  };
  const removeRecent = (id: number) => {
    const next = recent.filter(r => r.id !== id);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const searching = Boolean(q.trim());
  const count = results.users.length + results.posts.length + results.groups.length + results.listings.length + results.events.length;
  const row = (key: string, href: string, title: string, sub: string, person?: Contact) => (
    <div key={key} className={styles.searchRow} role="button" tabIndex={0} onClick={() => go(href, person)} onKeyDown={e => e.key === 'Enter' && go(href, person)}>
      {person ? <Avatar src={person.avatarUrl} alt="" size={36} /> : <span className={styles.searchRowIcon}><SearchIcon size={18} /></span>}
      <span className={styles.searchRowText}>
        {title}
        {sub && <div className={styles.searchRowSub}>{sub}</div>}
      </span>
    </div>
  );

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
          {searching && count === 0 && <div className={styles.searchEmpty}>No results found</div>}
          {!searching && recent.length === 0 && <div className={styles.searchEmpty}>No recent searches</div>}
          {searching && results.users.length > 0 && <div className={styles.searchHeading}><span>People</span></div>}
          {searching && results.users.map(c => row(`u${c.id}`, `/profile/${c.id}`, c.name, '', {id: c.id, name: c.name, avatarUrl: c.avatarUrl, isOnline: false}))}
          {searching && results.posts.length > 0 && <div className={styles.searchHeading}><span>Posts</span></div>}
          {searching && results.posts.map(p => row(`p${p.id}`, `/profile/${p.authorId}`, p.snippet, p.authorName))}
          {searching && results.groups.length > 0 && <div className={styles.searchHeading}><span>Groups</span></div>}
          {searching && results.groups.map(g => row(`g${g.id}`, `/groups/${g.id}`, g.name, 'Group'))}
          {searching && results.listings.length > 0 && <div className={styles.searchHeading}><span>Marketplace</span></div>}
          {searching && results.listings.map(l => row(`l${l.id}`, `/marketplace/item/${l.id}`, l.title, `$${(l.priceCents / 100).toFixed(2)}`))}
          {searching && results.events.length > 0 && <div className={styles.searchHeading}><span>Events</span></div>}
          {searching && results.events.map(e => row(`e${e.id}`, '/events', e.title, 'Event'))}
          {!searching && recent.map(c => (
            <div key={c.id} className={styles.searchRow} role="button" tabIndex={0} onClick={() => go(`/profile/${c.id}`, c)} onKeyDown={e => e.key === 'Enter' && go(`/profile/${c.id}`, c)}>
              <span className={styles.searchRowIcon}><ClockIcon size={18} /></span>
              <span className={styles.searchRowText}>{c.name}</span>
              <button className={styles.rrIconBtn} aria-label="Remove" onClick={e => { e.stopPropagation(); removeRecent(c.id); }}>
                <CloseIcon size={16} />
              </button>
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
  const router = useRouter();
  const [menuQuery, setMenuQuery] = useState('');
  const [storyOpen, setStoryOpen] = useState(false);
  const items = MENU_ITEMS.filter(item => item.label.toLowerCase().includes(menuQuery.trim().toLowerCase()));
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Menu</div>
      <div className={styles.msgSearch}>
        <SearchIcon size={16} />
        <input placeholder="Search menu" aria-label="Search menu" value={menuQuery} onChange={e => setMenuQuery(e.target.value)} />
      </div>
      <div className={styles.panelSub}>Social</div>
      <div className={styles.menuGrid}>
        {items.map(({label, Icon, href}) => (
          <Link key={label} href={href} className={styles.menuTile}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <div className={styles.panelSub}>Create</div>
      <button className={styles.menuRow} onClick={() => { window.dispatchEvent(new Event(COMPOSE_EVENT)); router.push('/'); }}>
        <span className={styles.menuIcon}><PencilIcon size={20} /></span>
        Post
      </button>
      <button className={styles.menuRow} onClick={() => setStoryOpen(true)}>
        <span className={styles.menuIcon}><PlusIcon size={20} /></span>
        Story
      </button>
      <Link href="/groups" className={styles.menuRow}>
        <span className={styles.menuIcon}><UsersIcon size={20} /></span>
        Group
      </Link>
      <Link href="/events" className={styles.menuRow}>
        <span className={styles.menuIcon}><RailEventsIcon /></span>
        Event
      </Link>
      <CreateStoryDialog open={storyOpen} onClose={() => setStoryOpen(false)} />
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
    document.documentElement.dataset.fbTheme = t;
    document.documentElement.dataset.theme = t;
    localStorage.setItem('fb.theme', t);
    document.cookie = `fb.theme=${t};path=/;max-age=31536000;SameSite=Lax`;
  };
  return {theme, setTheme};
}

function FeedbackBox() {
  const [message, setMessage] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const send = async () => {
    const text = message.trim();
    if (!text) return;
    const res = await fetch('/api/feedback', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({message: text})});
    setNote(res.ok ? 'Sent. It is in your notifications.' : 'Could not send that');
    if (res.ok) setMessage('');
  };
  return (
    <div style={{padding: 8}}>
      <textarea className={styles.imageUrlInput} style={{width: '100%', height: 100, padding: 8, borderRadius: 8, border: '1px solid var(--fb-divider)', background: 'transparent', color: 'inherit'}} placeholder="Tell us what broke" value={message} onChange={e => setMessage(e.target.value)} />
      <button className="fb-btn-primary" style={{marginTop: 8}} onClick={send}>Send</button>
      {note && <div className={styles.footerNote}>{note}</div>}
    </div>
  );
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
        {view === 'settings' && (
          <>
            <Link href="/settings" className={styles.menuRow}><span className={styles.menuIcon}><SettingsIcon size={20} /></span>Settings</Link>
            <Link href="/privacy" className={styles.menuRow}><span className={styles.menuIcon}><SettingsIcon size={20} /></span>Privacy Checkup</Link>
            <Link href={`/profile/${user.id}`} className={styles.menuRow}><span className={styles.menuIcon}><SettingsIcon size={20} /></span>Activity log</Link>
            <Link href="/" className={styles.menuRow}><span className={styles.menuIcon}><SettingsIcon size={20} /></span>Feed</Link>
          </>
        )}
        {view === 'help' && (
          <>
            <Link href="/settings#help" className={styles.menuRow}><span className={styles.menuIcon}><HelpIcon size={20} /></span>Help Center</Link>
            <Link href="/notifications" className={styles.menuRow}><span className={styles.menuIcon}><HelpIcon size={20} /></span>Support Inbox</Link>
            <Link href="/settings#feedback" className={styles.menuRow}><span className={styles.menuIcon}><HelpIcon size={20} /></span>Report a problem</Link>
          </>
        )}
        {view === 'feedback' && <FeedbackBox />}
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
        <Link href="/friends" className={styles.acctAll}>See all profiles</Link>
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
