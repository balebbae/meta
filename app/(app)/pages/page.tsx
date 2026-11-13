import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {listGroups} from '@/lib/secondary-queries';
import styles from '@/components/pages/simple.module.css';

export const metadata: Metadata = {title: 'Pages | Facebook'};
export const dynamic = 'force-dynamic';

export default async function PagesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const groups = (await listGroups(user.id)).filter(group => group.privacy === 'public' || group.isMember);
  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Pages</h1>
        <p className={styles.sub}>Public groups and groups you have joined.</p>
        {groups.length === 0 && <p className={styles.sub}>No pages yet.</p>}
        {groups.map(group => (
          <Link key={group.id} href={`/groups/${group.id}`} className={styles.row}>
            <span>
              {group.name}
              <span className={styles.hint}>{group.privacy === 'public' ? 'Public' : 'Private'} · {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
