import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getFeedReel, getReel, listFeedReels, listReels, type Reel} from '@/lib/reels';
import ReelsViewer from '@/components/reels/ReelsViewer';

export const dynamic = 'force-dynamic';

export const metadata = {title: 'Reels | Facebook'};

const pageOf = (list: Reel[]) => ({reels: list, nextAfter: list.length ? list[list.length - 1].id : null});

/**
 * /reels: one feed, general Reels with the fitness library mixed in (tagged #activities).
 * ?tag= shows only fitness Reels with that tag. ?feed=<id> opens a general Reel, ?reel=<id> a fitness one (both come from Share).
 */
export default async function ReelsPage({searchParams}: {searchParams: Promise<{tag?: string; reel?: string; feed?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const {tag, reel, feed} = await searchParams;
  const reelId = Number(reel);
  const feedId = Number(feed);
  const [fitnessList, feedList, firstFitness, firstFeed] = await Promise.all([
    listReels({tag, limit: 12}),
    tag ? [] : listFeedReels({limit: 12}),
    Number.isInteger(reelId) && reelId > 0 ? getReel(reelId) : null,
    Number.isInteger(feedId) && feedId > 0 ? getFeedReel(feedId) : null,
  ]);
  return (
    <div data-layout="wide">
      <ReelsViewer fitness={pageOf(fitnessList)} feed={pageOf(feedList)} first={firstFitness ?? firstFeed} initialTag={tag} />
    </div>
  );
}
