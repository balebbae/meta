import type {Metadata} from 'next';
import Link from 'next/link';
import {listVideos} from '@/lib/secondary-queries';
import {matchesQuery} from '@/lib/secondary-data';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {VideoCard} from '@/components/pages/VideoCard';
import {BookmarkIcon, ExploreIcon, HomeIcon, LiveIcon, ReelsIcon, ShowsIcon} from '@/components/pages/icons';
import styles from '@/components/pages/video.module.css';

export const metadata: Metadata = {title: 'Video | Facebook'};
export const dynamic = 'force-dynamic';

export default async function VideoPage({searchParams}: {searchParams: Promise<{tab?: string; q?: string}>}) {
  const {tab, q} = await searchParams;
  const videos = (await listVideos()).filter(video => matchesQuery(q, video.title, video.channel.name));
  const empty = tab === 'live' ? 'No one is live.' : tab === 'shows' ? 'No shows yet.' : videos.length === 0 ? 'No videos match that search.' : null;
  return (
    <SecondaryLayout
      center
      panel={
        <>
          <PanelHeader title="Video" />
          <PanelSearch placeholder="Search videos" />
          <PanelRow icon={<HomeIcon />} label="Home" href="/video" active={!tab} />
          <PanelRow icon={<LiveIcon />} label="Live" href="/video?tab=live" active={tab === 'live'} />
          <PanelRow icon={<ReelsIcon />} label="Reels" href="/reels" />
          <PanelRow icon={<ShowsIcon />} label="Shows" href="/video?tab=shows" active={tab === 'shows'} />
          <PanelRow icon={<ExploreIcon />} label="Explore" href="/video?tab=explore" active={tab === 'explore'} />
          <PanelDivider />
          <PanelRow icon={<BookmarkIcon />} label="Saved videos" href="/saved" />
        </>
      }>
      <div className={styles.feed}>
        <nav className={styles.tabs} aria-label="Video">
          <Link href="/video" className={!tab ? styles.tabOn : styles.tab}>Home</Link>
          <Link href="/video?tab=live" className={tab === 'live' ? styles.tabOn : styles.tab}>Live</Link>
          <Link href="/reels" className={styles.tab}>Reels</Link>
          <Link href="/video?tab=shows" className={tab === 'shows' ? styles.tabOn : styles.tab}>Shows</Link>
          <Link href="/video?tab=explore" className={tab === 'explore' ? styles.tabOn : styles.tab}>Explore</Link>
        </nav>
        <h2 className={styles.feedHead}>{tab === 'live' ? 'Live' : tab === 'shows' ? 'Shows' : tab === 'explore' ? 'Explore' : 'For you'}</h2>
        {empty ? <div className={styles.empty}>{empty}</div> : videos.map(v => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </SecondaryLayout>
  );
}
