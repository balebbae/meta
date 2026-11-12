import {redirect} from 'next/navigation';
import {Feed} from '@/components/feed/Feed';
import {getSessionUser} from '@/lib/auth';
import {listFeedPage, listStories} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [page, stories] = await Promise.all([listFeedPage(user.id, null, 6), listStories()]);
  return <Feed viewer={user} initialPosts={page.posts} initialCursor={page.nextCursor} stories={stories} />;
}
