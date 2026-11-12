'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Group, GroupMember} from '@/lib/secondary-queries';
import {formatCount} from '@/lib/secondary-data';
import {CheckIcon, GlobeIcon, LockIcon, MoreIcon, PlusIcon, ShareIcon} from './icons';
import styles from './groups.module.css';

const TABS = [
  {key: 'about', label: 'About'},
  {key: 'discussion', label: 'Discussion'},
  {key: 'members', label: 'Members'},
  {key: 'events', label: 'Events'},
] as const;
export type GroupTab = (typeof TABS)[number]['key'];

export function GroupHeader({group, members, tab}: {group: Group; members: GroupMember[]; tab: GroupTab}) {
  const router = useRouter();
  const [member, setMember] = useState(group.isMember);
  const [count, setCount] = useState(group.memberCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !member;
    setMember(next);
    setCount(c => c + (next ? 1 : -1));
    const res = await fetch(`/api/groups/${group.id}/join`, {method: next ? 'POST' : 'DELETE'});
    setBusy(false);
    if (!res.ok) {
      setMember(!next);
      setCount(c => c + (next ? -1 : 1));
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.cover}>
          <Image src={group.coverUrl} alt="" fill priority sizes="1250px" />
        </div>
        <div className={styles.heroBody}>
          <div>
            <h1 className={styles.groupName}>{group.name}</h1>
            <div className={styles.groupMeta}>
              {group.privacy === 'private' ? <LockIcon size={14} /> : <GlobeIcon size={14} />}
              <span>{group.privacy === 'private' ? 'Private group' : 'Public group'}</span>
              <span>·</span>
              <Link href={`/groups/${group.id}?tab=members`}>{formatCount(count)} members</Link>
            </div>
            <div className={styles.facepile}>
              {members.slice(0, 10).map(m => (
                <Image key={m.id} src={m.avatarUrl} alt={m.name} width={32} height={32} />
              ))}
            </div>
          </div>
          <div className={styles.heroActions}>
            {member ? (
              <>
                <button type="button" className={styles.btnSecondary}>
                  <PlusIcon size={16} />
                  Invite
                </button>
                <button type="button" className={styles.btnSecondary} onClick={toggle} aria-pressed>
                  <CheckIcon size={16} />
                  Joined
                </button>
              </>
            ) : (
              <button type="button" className={styles.btnPrimary} onClick={toggle}>
                <PlusIcon size={16} />
                Join group
              </button>
            )}
            <button type="button" className={styles.btnIcon} aria-label="Share">
              <ShareIcon size={20} />
            </button>
            <button type="button" className={styles.btnIcon} aria-label="More">
              <MoreIcon size={20} />
            </button>
          </div>
        </div>
        <nav className={styles.tabs} aria-label="Group sections">
          {TABS.map(t => (
            <Link key={t.key} href={`/groups/${group.id}?tab=${t.key}`} className={t.key === tab ? styles.tabActive : styles.tab}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
