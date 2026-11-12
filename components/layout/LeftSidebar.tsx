'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import {
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
  RailOrdersIcon,
  RailPagesIcon,
  RailReelsIcon,
  RailSavedIcon,
  RailVideoIcon,
} from '@/components/icons';
import type {User} from '@/lib/types';
import styles from './layout.module.css';

const PRIMARY = [
  {label: 'Friends', href: '/friends', Icon: RailFriendsIcon},
  {label: 'Memories', href: '/memories', Icon: RailMemoriesIcon},
  {label: 'Saved', href: '/saved', Icon: RailSavedIcon},
  {label: 'Groups', href: '/groups', Icon: RailGroupsIcon},
  {label: 'Video', href: '/video', Icon: RailVideoIcon},
  {label: 'Marketplace', href: '/marketplace', Icon: RailMarketplaceIcon},
  {label: 'Feeds', href: '/feeds', Icon: RailFeedsIcon},
  {label: 'Events', href: '/events', Icon: RailEventsIcon},
  {label: 'Ads Manager', href: '/ads', Icon: RailAdsIcon},
];
const MORE = [
  {label: 'Pages', href: '/pages', Icon: RailPagesIcon},
  {label: 'Gaming', href: '/gaming', Icon: RailGamingIcon},
  {label: 'Messenger', href: '/messages', Icon: RailMessengerIcon},
  {label: 'Fundraisers', href: '/fundraisers', Icon: RailFundraiserIcon},
  {label: 'Reels', href: '/reels', Icon: RailReelsIcon},
  {label: 'Climate Science Center', href: '/climate', Icon: RailClimateIcon},
  {label: 'Orders and payments', href: '/orders', Icon: RailOrdersIcon},
];
const SHORTCUTS = [
  {label: 'Bay Area Hikers', img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=72&h=72&fit=crop'},
  {label: 'React & Next.js Developers', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=72&h=72&fit=crop'},
  {label: 'Sourdough Bakers Club', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=72&h=72&fit=crop'},
];

export function LeftSidebar({user}: {user: User}) {
  const [more, setMore] = useState(false);
  return (
    <nav className={styles.leftRail} aria-label="Sidebar">
      <Link href={`/profile/${user.id}`} className={styles.railItem}>
        <span className={styles.railIcon}>
          <Avatar src={user.avatarUrl} alt="" size={36} />
        </span>
        {user.name}
      </Link>
      {PRIMARY.map(({label, href, Icon}) => (
        <Link key={label} href={href} className={styles.railItem}>
          <span className={styles.railIcon}>
            <Icon />
          </span>
          {label}
        </Link>
      ))}
      {more &&
        MORE.map(({label, href, Icon}) => (
          <Link key={label} href={href} className={styles.railItem}>
            <span className={styles.railIcon}>
              <Icon />
            </span>
            {label}
          </Link>
        ))}
      <button className={styles.railItem} onClick={() => setMore(v => !v)} aria-expanded={more}>
        <span className={styles.railChevron}>{more ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}</span>
        {more ? 'See less' : 'See more'}
      </button>
      <div className={styles.railDivider} />
      <div className={styles.railHeading}>
        <span>Your shortcuts</span>
        <button>Edit</button>
      </div>
      {SHORTCUTS.map(s => (
        <Link key={s.label} href="/groups" className={styles.railItem}>
          <Image src={s.img} alt="" width={36} height={36} className={styles.shortcutImg} />
          {s.label}
        </Link>
      ))}
      <div className={styles.railFooter}>
        {['Privacy', 'Terms', 'Advertising', 'Ad choices', 'Cookies', 'More'].map((l, i) => (
          <span key={l}>
            {i > 0 && ' · '}
            <a href="#">{l}</a>
          </span>
        ))}
        {' · '}Meta © 2026
      </div>
    </nav>
  );
}
