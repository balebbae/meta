import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getFeedReel, getReel, listFeedReels, listReels, type Reel} from '@/lib/reels';
import ReelsPager from '@/components/reels/ReelsPager';

export const dynamic = 'force-dynamic';

export const metadata = {title: 'Reels | Facebook'};

const pageOf = (list: Reel[]) => ({reels: list, nextAfter: list.length ? list[list.length - 1].id : null});

/** Puts a shared reel first without losing the keyset cursor of the page it came with. */
function withFirst(page: {reels: Reel[]; nextAfter: number | null}, first: Reel | null) {
  return first ? {...page, reels: [first, ...page.reels.filter(r => r.id !== first.id)]} : page;
}

/**
 * /reels: general Reels first; swipe left (or ?tab=fitness, ?tag=, ?reel=) for the fitness library.
 * ?feed=<id> opens a general Reel, ?reel=<id> a fitness one (both come from Share).
 */
export default async function ReelsPage({searchParams}: {searchParams: Promise<{tag?: string; reel?: string; feed?: string; tab?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const {tag, reel, feed, tab} = await searchParams;
  const reelId = Number(reel);
  const feedId = Number(feed);
  const [fitnessList, feedList, firstFitness, firstFeed] = await Promise.all([
    listReels({tag, limit: 12}),
    listFeedReels({limit: 12}),
    Number.isInteger(reelId) && reelId > 0 ? getReel(reelId) : null,
    Number.isInteger(feedId) && feedId > 0 ? getFeedReel(feedId) : null,
  ]);
  const initialPage = tab === 'fitness' || tag || firstFitness ? 1 : 0;
  return (
    <div data-layout="wide">
      <ReelsPager feed={withFirst(pageOf(feedList), firstFeed)} fitness={withFirst(pageOf(fitnessList), firstFitness)} initialPage={initialPage} initialTag={tag} />
    </div>
  );
}
