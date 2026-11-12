import type {Metadata} from 'next';
import {getSessionUser} from '@/lib/auth';
import {listVideos} from '@/lib/secondary-queries';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch, SecondaryLayout} from '@/components/pages/SecondaryLayout';
import {VideoCard} from '@/components/pages/VideoCard';
import {BookmarkIcon, ExploreIcon, HomeIcon, LiveIcon, ReelsIcon, ShowsIcon} from '@/components/pages/icons';
import styles from '@/components/pages/video.module.css';

export const metadata: Metadata = {title: 'Video | Facebook'};
export const dynamic = 'force-dynamic';

export default async function VideoPage() {
  await getSessionUser();
  const videos = await listVideos();
  return (
    <SecondaryLayout
      center
      panel={
        <>
          <PanelHeader title="Video" />
          <PanelSearch placeholder="Search videos" />
          <PanelRow icon={<HomeIcon />} label="Home" href="/video" active />
          <PanelRow icon={<LiveIcon />} label="Live" href="/video?tab=live" />
          <PanelRow icon={<ReelsIcon />} label="Reels" href="/video?tab=reels" />
          <PanelRow icon={<ShowsIcon />} label="Shows" href="/video?tab=shows" />
          <PanelRow icon={<ExploreIcon />} label="Explore" href="/video?tab=explore" />
          <PanelDivider />
          <PanelRow icon={<BookmarkIcon />} label="Saved videos" href="/saved" />
        </>
      }>
      <div className={styles.feed}>
        <h2 className={styles.feedHead}>For you</h2>
        {videos.map(v => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </SecondaryLayout>
  );
}
