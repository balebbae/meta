'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {Gamepad2, House, ShieldCheck, Sparkles, Target} from 'lucide-react';
import {Avatar} from '@/components/ui/Avatar';
import {
  RailActivitiesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RailAdsIcon,
  RailClimateIcon,
  RailEventsIcon,
  RailFeedsIcon,
  RailFriendsIcon,
  RailFundraiserIcon,
  RailGamingIcon,
  RailGroupsIcon,
  RailMarketplaceIcon,
  RailMemoriesIcon,
  RailMessengerIcon,
  RailMetaAIIcon,
  RailOrdersIcon,
  RailPagesIcon,
  RailReelsIcon,
  RailSavedIcon,
  RailVideoIcon,
} from '@/components/icons';
import {inActivities} from '@/lib/activities/mode';
import type {User} from '@/lib/types';
import styles from './layout.module.css';

const PRIMARY = [
  {label: 'Meta AI', href: '/meta-ai', Icon: RailMetaAIIcon},
  {label: 'Friends', href: '/friends', Icon: RailFriendsIcon},
  {label: 'Activities', href: '/activities', Icon: RailActivitiesIcon},
  {label: 'Memories', href: '/memories', Icon: RailMemoriesIcon},
  {label: 'Saved', href: '/saved', Icon: RailSavedIcon},
  {label: 'Groups', href: '/groups', Icon: RailGroupsIcon},
  {label: 'Reels', href: '/reels', Icon: RailReelsIcon},
  {label: 'Marketplace', href: '/marketplace', Icon: RailMarketplaceIcon},
  {label: 'Feeds', href: '/feeds', Icon: RailFeedsIcon},
  {label: 'Events', href: '/events', Icon: RailEventsIcon},
  {label: 'Ads Manager', href: '/ads', Icon: RailAdsIcon},
];
const MORE = [
  {label: 'Video', href: '/watch', Icon: RailVideoIcon},
  {label: 'Gaming', href: '/gaming', Icon: RailGamingIcon},
  {label: 'Pages', href: '/pages', Icon: RailPagesIcon},
  {label: 'Messenger', href: '/messages', Icon: RailMessengerIcon},
  {label: 'Fundraisers', href: '/fundraisers', Icon: RailFundraiserIcon},
  {label: 'Climate Science Center', href: '/climate', Icon: RailClimateIcon},
  {label: 'Orders and payments', href: '/orders', Icon: RailOrdersIcon},
];
// Activities mode sub-nav: shown above the usual items while html[data-mode='activities'] is on.
const ACTIVITIES = [
  {label: 'Home', href: '/activities', Icon: House},
  {label: 'Goals', href: '/activities/goals', Icon: Target},
  {label: 'Games', href: '/activities/games', Icon: Gamepad2},
  {label: 'Muse', href: '/activities/muse', Icon: Sparkles},
  {label: 'Privacy', href: '/activities/privacy', Icon: ShieldCheck},
];
const FOOTER = ['Privacy', 'Consumer Health Privacy', 'Terms', 'Advertising', 'Ad Choices \u25B7', 'Cookies', 'More'];

export function LeftSidebar({user}: {user: User}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const item = ({label, href, Icon}: {label: string; href: string; Icon: () => React.JSX.Element}) => (
    <Link key={label} href={href} className={`${styles.railItem} ${isActive(href) ? styles.railItemActive : ''}`} aria-current={isActive(href) ? 'page' : undefined}>
      <span className={styles.railIcon}>
        <Icon />
      </span>
      {label}
    </Link>
  );
  return (
    <nav className={styles.leftRail} aria-label="Sidebar">
      {inActivities(pathname) && (
        <div className={styles.actNav} role="group" aria-label="Activities">
          <span className={styles.actNavLabel}>Activities</span>
          {ACTIVITIES.map(({label, href, Icon}) => {
            // Home is the tab root (and the dev preview); the others own their sub-routes
            const current = href === '/activities' ? pathname === href || pathname === '/activities-preview' : isActive(href);
            return (
              <Link key={href} href={href} className={`${styles.railItem} ${styles.actNavItem} ${current ? styles.railItemActive : ''}`} aria-current={current ? 'page' : undefined}>
                <span className={styles.actNavIcon}>
                  <Icon size={18} strokeWidth={2.2} aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      )}
      <Link href={`/profile/${user.id}`} className={`${styles.railItem} ${isActive(`/profile/${user.id}`) ? styles.railItemActive : ''}`}>
        <span className={styles.railIcon}>
          <Avatar src={user.avatarUrl} alt="" size={36} />
        </span>
        {user.name}
      </Link>
      {PRIMARY.map(item)}
      {more && MORE.map(item)}
      <button className={styles.railItem} onClick={() => setMore(v => !v)} aria-expanded={more}>
        <span className={styles.railChevron}>{more ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}</span>
        {more ? 'See less' : 'See more'}
      </button>
      <div className={styles.railFooter}>
        {FOOTER.map((l, i) => (
          <span key={l}>
            {i > 0 && ' · '}
            <a href="#">{l}</a>
          </span>
        ))}
      </div>
    </nav>
  );
}
