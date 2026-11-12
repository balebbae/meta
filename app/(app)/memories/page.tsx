import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {listMemories} from '@/lib/secondary-queries';
import {PostCard} from '@/components/feed/PostCard';
import {PanelDivider, PanelHeader, PanelRow, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {BellIcon, CalendarXIcon, HomeIcon, PeopleIcon} from '@/components/pages/icons';
import {PanelSection} from '@/components/pages/SecondaryLayout';
import styles from '@/components/pages/saved.module.css';

export const metadata: Metadata = {title: 'Memories | Facebook'};
export const dynamic = 'force-dynamic';

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

function dayLabel(iso: string, now: Date) {
  const d = new Date(iso);
  const days = Math.round((now.getTime() - d.getTime()) / 86_400_000);
  const when = d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
  return {key: d.toDateString(), title: days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : days < 30 ? plural(Math.round(days / 7), 'week') : plural(Math.round(days / 30), 'month'), when};
}

export default async function MemoriesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const posts = await listMemories(user.id);
  const now = new Date();
  const groups = new Map<string, {title: string; when: string; posts: typeof posts}>();
  for (const p of posts) {
    const {key, title, when} = dayLabel(p.createdAt, now);
    if (!groups.has(key)) groups.set(key, {title, when, posts: []});
    groups.get(key)!.posts.push(p);
  }
  return (
    <SecondaryLayout
      center
      panel={
        <>
          <PanelHeader title="Memories" settings={false} />
          <PanelRow icon={<HomeIcon />} label="Memories Home" href="/memories" active />
          <PanelDivider />
          <PanelSection title="Settings" />
          <PanelRow icon={<BellIcon />} label="Notifications" sublabel="Highlights" href="/memories?tab=notifications" />
          <PanelRow icon={<PeopleIcon />} label="Hide People" sublabel="0 Hidden" href="/memories?tab=people" />
          <PanelRow icon={<CalendarXIcon />} label="Hide Dates" sublabel="0 Hidden" href="/memories?tab=dates" />
        </>
      }>
      <div className={styles.list}>
        <div className={styles.memoryHero}>
          <div className={styles.memoryBanner} aria-hidden />
          <div className={styles.memoryText}>
            <h2>On this day</h2>
            <p>
              {user.name.split(' ')[0]}, we care about you and the memories you share here. We thought you&apos;d like to look back on these posts.
            </p>
          </div>
        </div>
        {posts.length === 0 && <div className={styles.empty}>No memories to show today.</div>}
        {Array.from(groups.values()).map(g => (
          <div key={g.when} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <h3 className={styles.dayHead}>
              {g.title} <span>· {g.when}</span>
            </h3>
            {g.posts.map(p => (
              <PostCard key={p.id} post={p} viewer={user} />
            ))}
          </div>
        ))}
      </div>
    </SecondaryLayout>
  );
}
