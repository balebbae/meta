import {redirect} from 'next/navigation';
import {Feed} from '@/components/feed/Feed';
import {getSessionUser} from '@/lib/auth';
import {listFeedPage, listStories} from '@/lib/queries';
import {listFriendRequests, listSuggestions} from '@/lib/profile-queries';
import {listFeedReels} from '@/lib/reels';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [page, stories, requests, suggestions, reels] = await Promise.all([
    listFeedPage(user.id, null, 6), listStories(), listFriendRequests(user.id).catch(() => []),
    listSuggestions(user.id, 6).catch(() => []), listFeedReels({limit: 6}),
  ]);
  return <Feed viewer={user} initialPosts={page.posts} initialCursor={page.nextCursor} stories={stories} requests={requests}
    suggestions={suggestions.filter(s => !s.relation || s.relation === 'none')}
    reels={reels.filter(r => r.posterUrl).map(({id, posterUrl, caption}) => ({id, posterUrl, caption}))} />;
}
