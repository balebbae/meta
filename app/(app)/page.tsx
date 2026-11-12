import {getSessionUser} from '@/lib/auth';
import {listFeed} from '@/lib/queries';

export default async function HomePage() {
  const user = (await getSessionUser())!;
  const posts = await listFeed(user.id);
  return (
    <div style={{width: 'var(--fb-feed-w)', maxWidth: '100%', padding: '16px 0'}}>
      {/* Feed subagent: replace with <Stories/>, <Composer/>, <PostCard/> list */}
      <div className="fb-card" style={{padding: 16}}>
        Feed placeholder: {posts.length} posts loaded for {user.name}
      </div>
    </div>
  );
}
