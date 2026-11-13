'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import {MobilePinIcon} from '@/components/icons';
import {Popover} from '@/components/ui/Popover';
import type {Group} from '@/lib/secondary-queries';
import {PanelSearch} from './PanelSearch';
import styles from './groups.module.css';

export function MobileGroups({groups, view, q = ''}: {groups: Group[]; view: 'feed' | 'yours' | 'discover'; q?: string}) {
  const [sortOpen, setSortOpen] = useState(false);
  const [alphabetical, setAlphabetical] = useState(false);
  const joined = groups.filter(g => g.isMember && g.name.toLowerCase().includes(q.trim().toLowerCase()));
  if (alphabetical) joined.sort((a, b) => a.name.localeCompare(b.name));
  return <div className={styles.mobileGroups} data-mobile-groups>
    <nav className={styles.mobileTabs} aria-label="Groups mobile">
      {([['feed','For you','/groups'],['yours','Your groups','/groups?tab=yours'],['discover','Discover','/groups?tab=discover']] as const).map(([key, label, href]) => <Link key={key} href={href} className={view === key ? styles.mobileTabActive : ''} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
    {view !== 'discover' && <section className={styles.mobileJoined} aria-label={view === 'yours' ? 'Most visited groups' : 'Your groups'}>
      <div className={styles.mobileSectionHead}>
        <h2>{view === 'yours' ? 'Most visited' : 'Your groups'}</h2>
        {view === 'feed' ? <Link href="/groups?tab=yours">See all</Link> : <span className={styles.mobileSort}>
          <button onClick={() => setSortOpen(v => !v)} aria-expanded={sortOpen}>Sort</button>
          <Popover open={sortOpen} onClose={() => setSortOpen(false)} width={190}>
            <button onClick={() => { setAlphabetical(false); setSortOpen(false); }}>Recent activity</button>
            <button onClick={() => { setAlphabetical(true); setSortOpen(false); }}>Name (A–Z)</button>
          </Popover>
        </span>}
      </div>
      {view === 'yours' && <div className={styles.mobileGroupSearch}><PanelSearch placeholder="Search group name" /></div>}
      {joined.length === 0 && <p className={styles.mobileEmpty}>{q ? 'No groups found.' : "You haven't joined any groups yet."}</p>}
      {(view === 'feed' ? joined.slice(0, 3) : joined).map(g => <Link key={g.id} href={`/groups/${g.id}`} className={styles.mobileJoinedRow}>
        <Image src={g.iconUrl} alt="" width={48} height={48} />
        <span>{g.name}</span>
        <MobilePinIcon size={22} />
      </Link>)}
    </section>}
  </div>;
}
