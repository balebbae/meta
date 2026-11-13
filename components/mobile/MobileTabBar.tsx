'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState, type CSSProperties} from 'react';
import {Bell, House, SquarePlay, Store, type LucideIcon} from 'lucide-react';
import {ActivitiesIcon} from '@/components/icons';
import {Avatar} from '@/components/ui/Avatar';
import type {User} from '@/lib/types';
import styles from './mobile.module.css';

// liquid-glass-react reads `navigator` while rendering, so it can only render in the browser.
const LiquidGlass = dynamic(() => import('liquid-glass-react'), {ssr: false});

/** Floating dark liquid-glass tab bar, Instagram style: a wide lighter pill marks the current tab, red dots mark news. */
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
  const glyph = (Icon: LucideIcon, active: boolean, filled = false) => <Icon size={23} strokeWidth={active ? 2.3 : 1.9} fill={active && filled ? 'currentColor' : 'none'} aria-hidden />;
  const tabs = [
    {href: '/', label: 'Home', icon: (a: boolean) => glyph(House, a, true)},
    {href: '/reels', label: 'Reels', icon: (a: boolean) => glyph(SquarePlay, a)},
    {href: '/activities', label: 'Activities', icon: (a: boolean) => <ActivitiesIcon size={23} active={a} />},
    {href: '/marketplace', label: 'Marketplace', icon: (a: boolean) => glyph(Store, a)},
    {href: '/notifications', label: 'Notifications', icon: (a: boolean) => glyph(Bell, a, true), dot: notif > 0},
    {
      href: profileHref,
      label: 'Profile',
      icon: (a: boolean) => (
        <span className={`${styles.glassAvatar} ${a ? styles.glassAvatarOn : ''}`}>
          <Avatar src={user?.avatarUrl ?? ''} alt="" size={24} />
        </span>
      ),
    },
  ];

  const activeIndex = tabs.findIndex(t => isActive(t.href));

  return (
    <div className={`${styles.mobileOnly} ${styles.glassDock}`}>
      <LiquidGlass
        mode="standard"
        overLight
        cornerRadius={33}
        padding="0"
        blurAmount={0.7}
        saturation={150}
        displacementScale={70}
        aberrationIntensity={1}
        elasticity={0}
        style={{position: 'fixed', left: '50%', top: 'calc(100% - 45px - env(safe-area-inset-bottom))', zIndex: 50}}>
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
      </LiquidGlass>
    </div>
  );
}
