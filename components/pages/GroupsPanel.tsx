'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import type {Group} from '@/lib/secondary-queries';
import {timeAgo} from '@/lib/secondary-data';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch, PanelSection} from './SecondaryLayout';
import {CreateGroupDialog} from './CreateGroupDialog';
import {CompassIcon, FeedIcon, GroupsIcon, PlusIcon} from './icons';
import panel from './secondary.module.css';
import styles from './groups.module.css';

export function GroupsPanel({groups, active, activeGroupId}: {groups: Group[]; active?: 'feed' | 'discover' | 'yours'; activeGroupId?: number}) {
  const [open, setOpen] = useState(false);
  const joined = groups.filter(g => g.isMember);
  return (
    <>
      <PanelHeader title="Groups" />
      <PanelSearch placeholder="Search groups" />
      <PanelRow icon={<FeedIcon />} label="Your feed" href="/groups" active={active === 'feed'} />
      <PanelRow icon={<CompassIcon />} label="Discover" href="/groups?tab=discover" active={active === 'discover'} />
      <PanelRow icon={<GroupsIcon />} label="Your groups" href="/groups?tab=yours" active={active === 'yours'} />
      <button type="button" className={panel.panelButton} onClick={() => setOpen(true)}>
        <PlusIcon size={16} />
        Create new group
      </button>
      <PanelDivider />
      <PanelSection title="Groups you've joined" link="/groups?tab=yours" />
      {joined.map(g => (
        <Link key={g.id} href={`/groups/${g.id}`} className={styles.joined} aria-current={g.id === activeGroupId ? 'page' : undefined}>
          <Image src={g.iconUrl} alt="" width={48} height={48} className={styles.joinedIcon} />
          <div style={{minWidth: 0}}>
            <div className={styles.joinedName}>{g.name}</div>
            <div className={styles.joinedMeta}>{g.lastActiveAt ? `Last active ${timeAgo(g.lastActiveAt)}` : `${g.memberCount} members`}</div>
          </div>
        </Link>
      ))}
      <CreateGroupDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
