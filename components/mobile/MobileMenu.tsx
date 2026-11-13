'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {
  RailActivitiesIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  FeedbackIcon,
  HelpIcon,
  LockIcon,
  MoonIcon,
  RailAdsIcon,
  RailEventsIcon,
  RailFeedsIcon,
  RailFriendsIcon,
  RailGamingIcon,
  RailGroupsIcon,
  RailMarketplaceIcon,
  RailMemoriesIcon,
  RailPagesIcon,
  RailReelsIcon,
  RailSavedIcon,
  RailVideoIcon,
  SettingsIcon,
  WarningIcon,
  ActivitiesIcon, FriendsIcon, GroupsIcon, MarketplaceIcon, VideoIcon, GamingIcon, CalendarIcon, MenuGridIcon, PlusIcon, CloseIcon, CheckIcon, MuseMarkIcon, MobileSettingsIcon, MobileHelpIcon, MessengerIcon,
} from '@/components/icons';
import type {User} from '@/lib/types';
import {PeopleSearchButton} from './MobileHeader';
import styles from './mobile.module.css';
import menu from './menu.module.css';

const SHORTCUTS = [
  {label: 'Friends', Icon: RailFriendsIcon, href: '/friends'},
  {label: 'Activities', Icon: RailActivitiesIcon, href: '/activities'},
  {label: 'Memories', Icon: RailMemoriesIcon, href: '/memories'},
  {label: 'Groups', Icon: RailGroupsIcon, href: '/groups'},
  {label: 'Saved', Icon: RailSavedIcon, href: '/saved'},
  {label: 'Marketplace', Icon: RailMarketplaceIcon, href: '/marketplace'},
  {label: 'Video', Icon: RailVideoIcon, href: '/video'},
  {label: 'Events', Icon: RailEventsIcon, href: '/events'},
  {label: 'Feeds', Icon: RailFeedsIcon, href: '/feeds'},
  {label: 'Reels', Icon: RailReelsIcon, href: '/reels'},
  {label: 'Gaming', Icon: RailGamingIcon, href: '/gaming'},
  {label: 'Ads Manager', Icon: RailAdsIcon, href: '/ads'},
  {label: 'Pages', Icon: RailPagesIcon, href: '/pages'},
];

function Accordion({title, Icon, rows}: {title: string; Icon: React.ComponentType<{size?: number}>; rows: {label: string; Icon: React.ComponentType<{size?: number}>; href?: string}[]}) {
  const linked = rows.filter(row => row.href);
  const [open, setOpen] = useState(false);
  if (linked.length === 0) return null;
  return (
    <div className={styles.accordion}>
      <button className={styles.accordionHead} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>
          <Icon size={20} />
        </span>
        <span className={styles.grow}>{title}</span>
        {open ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
      </button>
      {open &&
        linked.map(({label, Icon: RowIcon, href}) =>
          href ? (
            <Link key={label} href={href} className={styles.accordionRow}>
              <RowIcon size={20} />
              {label}
            </Link>
          ) : (
            <button key={label} className={styles.accordionRow}>
              <RowIcon size={20} />
              {label}
            </button>
          ),
        )}
    </div>
  );
}

/**
 * The rail icons share gradient <defs> ids with the (display:none) desktop rail that precedes us in the DOM,
 * so the browser resolves url(#id) to an unrendered node. Re-key the ids inside this grid after mount.
 */
function useLocalGradientIds(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll('svg').forEach((svg, i) => {
      svg.querySelectorAll('linearGradient[id], radialGradient[id]').forEach(g => {
        const old = g.id;
        const next = `${old}-m${i}`;
        g.id = next;
        svg.querySelectorAll(`[fill="url(#${old})"]`).forEach(el => el.setAttribute('fill', `url(#${next})`));
        svg.querySelectorAll(`[stroke="url(#${old})"]`).forEach(el => el.setAttribute('stroke', `url(#${next})`));
      });
    });
  }, [ref]);
}

export function MobileMenu({user, drawer = false}: {user: User; drawer?: boolean}) {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  useLocalGradientIds(gridRef);
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/signout', {method: 'POST'});
    } finally {
      router.push('/auth');
      router.refresh();
    }
  };
  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    root.dataset.fbTheme = next;
    try {
      localStorage.setItem('fb.theme', next);
      document.cookie = `fb.theme=${next};path=/;max-age=31536000;SameSite=Lax`;
    } catch {}
  };
  return <>
    {!drawer && <div className={menu.legacy}>
    <div className={styles.menuPage}>
      <header className={`${styles.titleBar} ${styles.mobileOnly}`} style={{margin: '0 -12px', padding: 'calc(env(safe-area-inset-top) + 10px) 12px 10px 16px'}}>
        <h1>Menu</h1>
        <div style={{display: 'flex', gap: 8}}>
          <Link href="/settings" className={styles.titleBtn} aria-label="Settings">
            <SettingsIcon size={22} />
          </Link>
          <PeopleSearchButton className={styles.titleBtn} />
        </div>
      </header>
      <Link href={`/profile/${user.id}`} className={styles.profileCard}>
        <Avatar src={user.avatarUrl} alt={user.name} size={40} />
        <span className={styles.profileName}>
          {user.name}
          <br />
          <span className={styles.profileSub}>View your profile</span>
        </span>
        <ChevronRightIcon size={20} />
      </Link>
      <h2 className={styles.shortcutsHead}>Your shortcuts</h2>
      <div className={styles.menuGrid} ref={gridRef}>
        {SHORTCUTS.map(({label, Icon, href}) => (
          <Link key={label} href={href} className={styles.menuTile}>
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <Accordion
        title="Help & support"
        Icon={HelpIcon}
        rows={[
          {label: 'Help Center', Icon: HelpIcon, href: '/settings#help'},
          {label: 'Support Inbox', Icon: BookmarkIcon, href: '/notifications'},
          {label: 'Report a problem', Icon: WarningIcon, href: '/settings#feedback'},
          {label: 'Safety Center', Icon: LockIcon, href: '/privacy'},
        ]}
      />
      <Accordion
        title="Settings & privacy"
        Icon={SettingsIcon}
        rows={[
          {label: 'Settings', Icon: SettingsIcon, href: '/settings'},
          {label: 'Privacy Checkup', Icon: LockIcon, href: '/privacy'},
          {label: 'Activity log', Icon: ClockIcon, href: `/profile/${user.id}`},
          {label: 'Feedback', Icon: FeedbackIcon, href: '/settings#feedback'},
        ]}
      />
      <button className={styles.accordion + ' ' + styles.accordionHead} style={{marginTop: 8}} onClick={toggleTheme}>
        <span>
          <MoonIcon size={20} />
        </span>
        <span className={styles.grow}>Dark mode</span>
      </button>
      <button className={styles.logout} onClick={logout} disabled={busy}>
        {busy ? 'Logging out…' : 'Log out'}
      </button>
    </div>
    </div>}
    <MenuContent user={user} busy={busy} logout={logout} toggleTheme={toggleTheme} />
  </>;
}

const OUTLINE_ICONS = [FriendsIcon, ActivitiesIcon, ClockIcon, GroupsIcon, BookmarkIcon, MarketplaceIcon, VideoIcon, CalendarIcon, MenuGridIcon, VideoIcon, GamingIcon, FeedbackIcon, BookmarkIcon];

function MenuContent({user, busy, logout, toggleTheme}: {user: User; busy: boolean; logout: () => void; toggleTheme: () => void}) {
  const [expanded, setExpanded] = useState(false);
  const [promo, setPromo] = useState(true);
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try { setPromo(localStorage.getItem('fb.muse-promo-dismissed') !== 'true'); } catch {}
  }, []);
  useEffect(() => {
    if (!sheet) return;
    const dialog = sheetRef.current!;
    const overflow = document.body.style.overflow;
    const nested = !!dialog.parentElement?.closest('dialog[open]');
    if (!nested) document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); if (!nested) document.body.style.overflow = overflow; };
  }, [sheet]);
  function dismissPromo() {
    setPromo(false);
    try { localStorage.setItem('fb.muse-promo-dismissed', 'true'); } catch {}
  }
  return <section className={menu.content} aria-label="Menu shortcuts">
    <div className={menu.profileCard}>
      <div className={menu.profileRow}>
        <Link href={`/profile/${user.id}`} className={menu.nameRow}><Avatar src={user.avatarUrl} alt="" size={40} /><strong>{user.name}</strong></Link>
        <button className={menu.profileToggle} aria-label="Switch profile" onClick={() => setSheet(true)}><ChevronDownIcon size={20} /></button>
      </div>
      <Link href="/pages" className={menu.createPage}><span className={menu.plus}><PlusIcon size={22} /></span>Create Facebook Page</Link>
    </div>
    {promo && <aside className={menu.promo} aria-label="Muse">
      <h2><MuseMarkIcon size={22} />Muse</h2>
      <button aria-label="Dismiss Muse promo" className={menu.dismiss} onClick={dismissPromo}><CloseIcon size={16} /></button>
      <p>Meet Muse, your personal AI agent.</p>
      <Link href="/activities/muse">Try Muse</Link>
    </aside>}
    <nav className={menu.shortcuts} aria-label="Shortcuts">
      {SHORTCUTS.slice(0, expanded ? SHORTCUTS.length : 5).map(({label, href}, i) => {
        const Icon = OUTLINE_ICONS[i];
        return <Link key={href} href={href} className={menu.shortcut}><Icon size={26} /><span>{label}</span></Link>;
      })}
    </nav>
    <button className={menu.seeMore} aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'See less' : 'See more'}</button>
    <details className={menu.accordion}>
      <summary><MobileHelpIcon size={24} /><span>Help and support</span><ChevronDownIcon size={20} /></summary>
      <Link href="/settings#help">Help Center</Link><Link href="/notifications">Support Inbox</Link><Link href="/settings#feedback">Report a problem</Link><Link href="/privacy">Safety Center</Link>
    </details>
    <details className={menu.accordion}>
      <summary><MobileSettingsIcon size={24} /><span>Settings and privacy</span><ChevronDownIcon size={20} /></summary>
      <Link href="/settings">Settings</Link><Link href="/privacy">Privacy Checkup</Link><Link href={`/profile/${user.id}`}>Activity log</Link><Link href="/settings#feedback">Feedback</Link>
      <button onClick={toggleTheme}><MoonIcon size={20} />Dark mode</button>
      <button onClick={logout} disabled={busy}>{busy ? 'Logging out…' : 'Log out'}</button>
    </details>
    <details className={menu.accordion} open>
      <summary><MenuGridIcon size={24} /><span>Upgrades</span><ChevronDownIcon size={20} /></summary>
      <div className={menu.cards}>
        <Link href="/pages"><span className={menu.cardArt}><GroupsIcon size={36} /></span><strong>Public presence</strong><small>Get tools to help you grow on Facebook.</small></Link>
        <Link href="/settings"><span className={`${menu.cardArt} ${menu.blueArt}`}><CheckIcon size={36} /></span><strong>Facebook Plus</strong><small>Unlock exclusive features and more.</small></Link>
      </div>
    </details>
    <details className={menu.accordion} open>
      <summary><MenuGridIcon size={24} /><span>Also from Meta</span><ChevronDownIcon size={20} /></summary>
      <Link href="/messages"><MessengerIcon size={24} />Messenger</Link><Link href="/reels"><VideoIcon size={24} />Reels</Link>
    </details>
    {sheet && <dialog ref={sheetRef} className={menu.sheet} aria-label="Profile switcher" onCancel={e => { e.preventDefault(); e.stopPropagation(); setSheet(false); }} onClick={e => { if (e.target === e.currentTarget) setSheet(false); }}>
      <div className={menu.sheetBody}>
        <button className={menu.handle} aria-label="Close profile switcher" onClick={() => setSheet(false)}><span /></button>
        <div className={menu.sheetCard}>
          <Link href={`/profile/${user.id}`} className={menu.nameRow}><Avatar src={user.avatarUrl} alt="" size={40} /><strong>{user.name}</strong><span className={menu.checked} aria-label="Current profile"><CheckIcon size={16} /></span></Link>
          <Link href="/pages" className={menu.sheetCreate}><span className={menu.plus}><PlusIcon size={24} /></span>Create Facebook Page</Link>
        </div>
        <Link href="/settings" className={menu.accounts}>Go to Accounts Center</Link>
        <p className={menu.meta}><span>∞</span> Meta</p>
      </div>
    </dialog>}
  </section>;
}
