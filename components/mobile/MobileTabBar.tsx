'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState, type CSSProperties} from 'react';
import {ActivitiesIcon, HomeIcon, VideoIcon, MarketplaceIcon, MobileBellIcon} from '@/components/icons';
import {Avatar} from '@/components/ui/Avatar';
import type {User} from '@/lib/types';
import styles from './mobile.module.css';

export function MobileTabBar({user}: {user?: Pick<User, 'id' | 'avatarUrl' | 'name'>}) {
  const pathname = usePathname();
  const [notif, setNotif] = useState(0);
  useEffect(() => {
    fetch('/api/notifications', {cache: 'no-store'})
      .then(r => (r.ok ? r.json() : null))
      .then((d: {unreadCount?: number} | null) => setNotif(Number(d?.unreadCount) || 0))
      .catch(() => {});
  }, [pathname]);

  // The tapped tab lights up at once; the route catches up when the next page has loaded.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);
  const matches = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));
  const isActive = (href: string) => (pending ? pending === href : matches(href));
  const profileHref = user ? `/profile/${user.id}` : '/profile';
  const tabs = [
    {href: '/', label: 'Home', icon: (a: boolean) => <HomeIcon size={24} active={a} />},
    {href: '/reels', label: 'Reels', icon: (a: boolean) => <VideoIcon size={24} active={a} />},
    {href: '/activities', label: 'Activities', icon: (a: boolean) => <ActivitiesIcon size={23} active={a} />},
    {href: '/marketplace', label: 'Marketplace', icon: (a: boolean) => <MarketplaceIcon size={24} active={a} />},
    {href: '/notifications', label: 'Notifications', icon: (a: boolean) => <MobileBellIcon size={24} active={a} />, dot: notif > 0},
    {
      href: profileHref,
      label: 'Profile',
      icon: (a: boolean) => (
        <span className={`${styles.glassAvatar} ${a ? styles.glassAvatarOn : ''}`}>
          <Avatar src={user?.avatarUrl ?? ''} alt="" size={26} />
        </span>
      ),
    },
  ];

  const activeIndex = tabs.findIndex(t => isActive(t.href));

  return (
    <div className={`${styles.mobileOnly} ${styles.glassDock}`}>
        <nav className={styles.glassBar} aria-label="Mobile navigation" style={{'--tabs': tabs.length} as CSSProperties}>
          <span className={styles.glassIndicator} style={{'--i': Math.max(0, activeIndex), opacity: activeIndex < 0 ? 0 : 1} as CSSProperties} aria-hidden />
          {tabs.map(({href, label, icon, dot}) => {
            const active = isActive(href);
            return (
              <Link key={label} href={href} onClick={() => !matches(href) && setPending(href)} className={`${styles.glassTab} ${active ? styles.glassTabOn : ''}`} aria-label={dot ? `${label}, ${notif} unread` : label} aria-current={active ? 'page' : undefined}>
                {icon(active)}
                {dot && <span className={styles.glassDot} aria-hidden />}
              </Link>
            );
          })}
        </nav>
    </div>
  );
}
