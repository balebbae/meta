import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/auth';
import {getReel, listReels} from '@/lib/reels';
import ReelsViewer from '@/components/reels/ReelsViewer';

export const dynamic = 'force-dynamic';

export const metadata = {title: 'Reels | Facebook'};

export default async function ReelsPage({searchParams}: {searchParams: Promise<{tag?: string; reel?: string}>}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const {tag, reel: reelParam} = await searchParams;
  const page = await listReels({tag, limit: 12});
  const nextAfter = page.length ? page[page.length - 1].id : null;
  let reels = page;
  const wanted = reelParam ? Number(reelParam) : NaN;
  if (Number.isInteger(wanted) && wanted > 0) {
    const first = await getReel(wanted);
    if (first) reels = [first, ...reels.filter(r => r.id !== wanted)];
  }
  return (
    <div data-layout="wide">
      <ReelsViewer initialReels={reels} nextAfter={nextAfter} initialTag={tag} />
    </div>
  );
}
