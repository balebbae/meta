'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {House, List, Settings, Target} from 'lucide-react';
import {usePanelNav} from '@/components/activities/panels/nav';
import {panelHref} from '@/lib/activities/panel-href';
import {Avatar} from '@/components/ui/Avatar';
import {
  RailActivitiesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ConnectorsIcon,
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
  {label: 'Connectors', href: panelHref({panel: 'settings', tab: 'sources'}), Icon: ConnectorsIcon},
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
// Everything but Home opens a panel over /activities (games live in its "Your games" section)
const ACTIVITIES = [
  {label: 'Home', href: '/activities', Icon: House},
  {label: 'Logs', href: panelHref({panel: 'logs'}), Icon: List},
  {label: 'Goals', href: panelHref({panel: 'goals'}), Icon: Target},
  {label: 'Settings', href: panelHref({panel: 'settings'}), Icon: Settings},
];
const FOOTER = ['Privacy', 'Consumer Health Privacy', 'Terms', 'Advertising', 'Ad Choices \u25B7', 'Cookies', 'More'];

export function LeftSidebar({user}: {user: User}) {
  const pathname = usePathname();
  const panels = usePanelNav();
  const [more, setMore] = useState(false);
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };
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
              <Link
                key={href}
                href={href}
                // already on /activities: open the panel in place instead of re-rendering the page
                onClick={e => {
                  if (href !== '/activities' && pathname === '/activities') {
                    e.preventDefault();
                    panels.openHref(href);
                  }
                }}
                className={`${styles.railItem} ${styles.actNavItem} ${current ? styles.railItemActive : ''}`}
                aria-current={current ? 'page' : undefined}
              >
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
