'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {ActivitiesIcon, BellIcon, FriendsIcon, HomeIcon, MarketplaceIcon, VideoIcon} from '@/components/icons';
import type {User} from '@/lib/types';
import styles from './mobile.module.css';

/** Floating pill tab bar from the Facebook iOS app (Nov 2026). */
export function MobileTabBar({user}: {user?: Pick<User, 'id' | 'avatarUrl' | 'name'>}) {
  const pathname = usePathname();
  const [notif, setNotif] = useState(0);
  useEffect(() => {
    fetch('/api/notifications', {cache: 'no-store'})
      .then(r => (r.ok ? r.json() : null))
      .then((d: {unreadCount?: number} | null) => setNotif(Number(d?.unreadCount) || 0))
      .catch(() => {});
  }, [pathname]);

  const tabs = [
    {href: '/', label: 'Home', Icon: HomeIcon},
    {href: '/reels', label: 'Reels', Icon: VideoIcon},
    {href: '/activities', label: 'Activities', Icon: ActivitiesIcon},
    {href: '/marketplace', label: 'Marketplace', Icon: MarketplaceIcon},
    {href: '/notifications', label: 'Notifications', Icon: (p: {size?: number; active?: boolean}) => <BellIcon size={p.size} />, badge: notif},
  ];
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));
  const profileHref = user ? `/profile/${user.id}` : '/profile';
  return (
    <nav className={`${styles.mobileOnly} ${styles.tabBar}`} aria-label="Mobile navigation">
      {tabs.map(({href, label, Icon, badge = 0}) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} className={`${styles.tab} ${active ? styles.tabActive : ''}`} aria-label={label} aria-current={active ? 'page' : undefined}>
            <Icon size={28} active={active} />
            {badge > 0 && <span className={styles.tabBadge}>{badge > 9 ? '9+' : badge}</span>}
          </Link>
        );
      })}
      <Link href={profileHref} className={`${styles.tab} ${isActive(profileHref) ? styles.tabActive : ''}`} aria-label="Profile">
        {user ? (
          <span style={{borderRadius: '50%', outline: isActive(profileHref) ? '2px solid var(--fb-blue)' : 'none', outlineOffset: 2, display: 'flex'}}>
            <Avatar src={user.avatarUrl} alt={user.name} size={32} />
          </span>
        ) : (
          <FriendsIcon size={28} />
        )}
      </Link>
    </nav>
  );
}
