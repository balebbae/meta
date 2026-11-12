'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BellIcon, FriendsIcon, HomeIcon, MarketplaceIcon, MenuGridIcon, VideoIcon} from '@/components/icons';
import styles from './layout.module.css';

const TABS = [
  {href: '/', label: 'Home', Icon: HomeIcon},
  {href: '/video', label: 'Video', Icon: VideoIcon},
  {href: '/friends', label: 'Friends', Icon: FriendsIcon},
  {href: '/marketplace', label: 'Marketplace', Icon: MarketplaceIcon},
  {href: '/notifications', label: 'Notifications', Icon: BellIcon},
  {href: '/menu', label: 'Menu', Icon: MenuGridIcon},
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className={styles.bottomBar} aria-label="Mobile navigation">
      {TABS.map(({href, label, Icon}) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`${styles.bottomTab} ${active ? styles.bottomTabActive : ''}`} aria-label={label} aria-current={active ? 'page' : undefined}>
            <Icon size={24} />
          </Link>
        );
      })}
    </nav>
  );
}
