import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {getSessionUser} from '@/lib/auth';
import {listGroupFeed, listGroups} from '@/lib/secondary-queries';
import {formatCount} from '@/lib/secondary-data';
import {SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {GroupsPanel} from '@/components/pages/GroupsPanel';
import {GroupPostCard} from '@/components/pages/GroupPostCard';
import {GlobeIcon, LockIcon} from '@/components/pages/icons';
import styles from '@/components/pages/groups.module.css';
import mk from '@/components/pages/marketplace.module.css';

export const metadata: Metadata = {title: 'Groups | Facebook'};
export const dynamic = 'force-dynamic';

export default async function GroupsPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const {tab} = await searchParams;
  const user = await getSessionUser();
  const viewerId = user?.id ?? 0;
  const groups = await listGroups(viewerId);
  const active = tab === 'discover' ? 'discover' : tab === 'yours' ? 'yours' : 'feed';

  if (active !== 'feed') {
    const shown = active === 'yours' ? groups.filter(g => g.isMember) : groups.filter(g => !g.isMember);
    return (
      <SecondaryLayout panel={<GroupsPanel groups={groups} active={active} />}>
        <div className={mk.head}>
          <h2 className={mk.headTitle}>{active === 'yours' ? `All groups you've joined (${shown.length})` : 'Suggested for you'}</h2>
        </div>
        {shown.length === 0 ? (
          <div className={styles.emptyCard}>{active === 'yours' ? "You haven't joined any groups yet." : "You've joined every group. Nice."}</div>
        ) : (
          <div className={mk.grid} style={{gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))'}}>
            {shown.map(g => (
              <Link key={g.id} href={`/groups/${g.id}`} className={styles.post} style={{overflow: 'hidden', color: 'inherit'}}>
                <div style={{position: 'relative', aspectRatio: '16 / 9'}}>
                  <Image src={g.coverUrl} alt="" fill sizes="300px" style={{objectFit: 'cover'}} />
                </div>
                <div style={{padding: 12}}>
                  <div className={styles.joinedName}>{g.name}</div>
                  <div className={styles.joinedMeta} style={{display: 'flex', alignItems: 'center', gap: 4}}>
                    {g.privacy === 'private' ? <LockIcon size={12} /> : <GlobeIcon size={12} />}
                    {formatCount(g.memberCount)} members
                  </div>
                  <div className={styles.btnSecondary} style={{marginTop: 12, justifyContent: 'center', width: '100%'}}>
                    {g.isMember ? 'View group' : 'Join group'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SecondaryLayout>
    );
  }

  const posts = await listGroupFeed(viewerId);
  return (
    <SecondaryLayout center panel={<GroupsPanel groups={groups} active="feed" />}>
      <div className={styles.feed}>
        <h2 className={styles.feedHead}>Recent activity</h2>
        {posts.map(p => (
          <GroupPostCard key={p.id} post={p} />
        ))}
      </div>
    </SecondaryLayout>
  );
}
