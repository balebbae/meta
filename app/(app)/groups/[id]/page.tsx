import type {Metadata} from 'next';
import Image from '@/components/ui/SmartImage';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getGroup, listGroupMembers, listGroupPosts} from '@/lib/secondary-queries';
import {formatCount} from '@/lib/secondary-data';
import {GroupHeader, type GroupTab} from '@/components/pages/GroupHeader';
import {GroupPostCard} from '@/components/pages/GroupPostCard';
import {GroupComposer} from '@/components/pages/GroupComposer';
import {CalendarIcon, GlobeIcon, GroupsIcon, LockIcon} from '@/components/pages/icons';
import styles from '@/components/pages/groups.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const group = await getGroup(0, Number(id));
  return {title: group ? `${group.name} | Facebook` : 'Groups | Facebook'};
}

export default async function GroupPage({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{tab?: string}>}) {
  const [{id}, {tab: rawTab}] = await Promise.all([params, searchParams]);
  const user = await getSessionUser();
  const group = await getGroup(user?.id ?? 0, Number(id));
  if (!group) notFound();
  const tab: GroupTab = rawTab === 'about' || rawTab === 'members' || rawTab === 'events' ? rawTab : 'discussion';
  const [posts, members] = await Promise.all([listGroupPosts(group.id), listGroupMembers(group.id, tab === 'members' ? 100 : 10)]);
  const canSee = group.privacy === 'public' || group.isMember;

  const about = (
    <aside className={styles.aboutCard}>
      <h3 className={styles.aboutTitle}>About</h3>
      {group.description && <p className={styles.aboutText}>{group.description}</p>}
      <div className={styles.aboutRow}>
        {group.privacy === 'private' ? <LockIcon size={20} /> : <GlobeIcon size={20} />}
        <div>
          <strong>{group.privacy === 'private' ? 'Private' : 'Public'}</strong>
          <span>{group.privacy === 'private' ? "Only members can see who's in the group and what they post." : "Anyone can see who's in the group and what they post."}</span>
        </div>
      </div>
      <div className={styles.aboutRow}>
        <GroupsIcon size={20} />
        <div>
          <strong>{formatCount(group.memberCount)} members</strong>
          <span>{members.filter(m => m.role === 'admin').length} admins</span>
        </div>
      </div>
      <div className={styles.aboutRow}>
        <CalendarIcon size={20} />
        <div>
          <strong>Dallas, TX</strong>
          <span>Most members are in the Dallas–Fort Worth area.</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div data-layout="wide" className={styles.groupPage}>
      <GroupHeader group={group} members={members} tab={tab} />
      <div className={styles.groupBody}>
        <div className={styles.groupMain}>
          {tab === 'discussion' && (
            <>
              {user && group.isMember && <GroupComposer groupId={group.id} user={user} />}
              {!canSee ? (
                <div className={styles.emptyCard}>This group is private. Join to see posts.</div>
              ) : posts.length === 0 ? (
                <div className={styles.emptyCard}>No posts yet. Start the conversation.</div>
              ) : (
                posts.map(p => <GroupPostCard key={p.id} post={p} showGroup={false} />)
              )}
            </>
          )}
          {tab === 'about' && <div className={styles.post} style={{padding: 16}}>{about}</div>}
          {tab === 'members' && (
            <div className={styles.memberGrid}>
              {members.map(m => (
                <Link key={m.id} href={`/profile/${m.id}`} className={styles.member}>
                  <Image src={m.avatarUrl} alt="" width={48} height={48} style={{borderRadius: '50%'}} />
                  <div>
                    <div className={styles.memberName}>{m.name}</div>
                    <div className={styles.memberRole}>{m.role === 'admin' ? 'Admin' : 'Member'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {tab === 'events' && <div className={styles.emptyCard}>No upcoming events in this group.</div>}
        </div>
        {tab !== 'about' && about}
      </div>
    </div>
  );
}
