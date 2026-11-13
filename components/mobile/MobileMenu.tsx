'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {
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
  RailClimateIcon,
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
} from '@/components/icons';
import type {User} from '@/lib/types';
import {PeopleSearchButton} from './MobileHeader';
import styles from './mobile.module.css';

const SHORTCUTS = [
  {label: 'Friends', Icon: RailFriendsIcon, href: '/friends'},
  {label: 'Activities', Icon: RailGamingIcon, href: '/activities'},
  {label: 'Health', Icon: RailClimateIcon, href: '/health'},
  {label: 'Log a workout', Icon: RailGamingIcon, href: '/activities/log'},
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

export function MobileMenu({user}: {user: User}) {
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
  return (
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
  );
}
