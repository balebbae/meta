'use client';

import Link from 'next/link';
import {useState} from 'react';
import {ChevronDownIcon} from '@/components/icons';
import {Popover} from '@/components/ui/Popover';
import {MARKETPLACE_CATEGORIES, MARKETPLACE_LOCATION} from '@/lib/secondary-data';
import {CreateListingDialog} from './CreateListingDialog';
import styles from './marketplace.module.css';

export function MobileMarketplaceNav({tab, category, q}: {tab?: string; category?: string; q?: string}) {
  const [selling, setSelling] = useState(false);
  const [more, setMore] = useState(false);
  const city = MARKETPLACE_LOCATION.city.split(',')[0];
  const local = q === city;
  return <nav className={styles.mobileNav} data-mobile-marketplace aria-label="Marketplace mobile">
    <button onClick={() => setSelling(true)}>Sell</button>
    <Link href="/marketplace" className={!tab && !category && !q ? styles.mobileTabActive : ''} aria-current={!tab && !category && !q ? 'page' : undefined}>For you</Link>
    <Link href={`/marketplace?q=${encodeURIComponent(city)}`} className={local ? styles.mobileTabActive : ''} aria-current={local ? 'page' : undefined}>Local</Link>
    <Link href="/marketplace?tab=jobs" className={tab === 'jobs' ? styles.mobileTabActive : ''} aria-current={tab === 'jobs' ? 'page' : undefined}>Services</Link>
    <span className={styles.mobileMore}>
      <button onClick={() => setMore(v => !v)} aria-expanded={more}>More <ChevronDownIcon size={16} /></button>
      <Popover open={more} onClose={() => setMore(false)} width={240}>
        <div className={styles.mobileOptions}>
          {[['buying','Buying'],['selling','Selling'],['inbox','Inbox'],['notifications','Notifications'],['status','Marketplace status']].map(([id, label]) => <Link key={id} href={`/marketplace?tab=${id}`} onClick={() => setMore(false)}>{label}</Link>)}
          {MARKETPLACE_CATEGORIES.map(name => <Link key={name} href={`/marketplace?category=${encodeURIComponent(name)}`} onClick={() => setMore(false)}>{name}</Link>)}
        </div>
      </Popover>
    </span>
    <CreateListingDialog open={selling} onClose={() => setSelling(false)} />
  </nav>;
}
