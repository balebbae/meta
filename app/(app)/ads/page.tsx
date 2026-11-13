import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {Board} from '@/components/pages/Board';
import {getSessionUser} from '@/lib/auth';
import {listLabeledPosts} from '@/lib/search';

export const metadata: Metadata = {title: 'Ads Manager | Facebook'};
export const dynamic = 'force-dynamic';

export default async function AdsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const posts = await listLabeledPosts(user.id, 'Sponsored');
  return (
    <Board
      title="Ads Manager"
      blurb="Write an ad. It is posted publicly and listed here."
      prefix="Sponsored"
      placeholder="What do you want to advertise?"
      posts={posts}
    />
  );
}
