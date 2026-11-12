import {redirect} from 'next/navigation';
import {Feed} from '@/components/feed/Feed';
import {getSessionUser} from '@/lib/auth';
import {listFeedPage, listStories} from '@/lib/queries';
import {listFriendRequests} from '@/lib/profile-queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [page, stories, requests] = await Promise.all([listFeedPage(user.id, null, 6), listStories(), listFriendRequests(user.id).catch(() => [])]);
  return <Feed viewer={user} initialPosts={page.posts} initialCursor={page.nextCursor} stories={stories} requests={requests} />;
}
