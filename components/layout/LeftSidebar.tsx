import type {User} from '@/lib/types';

/** Feed-UI subagent: replace with the Facebook left rail (profile row, Friends, Memories, Saved, Groups, Video, Marketplace, Feeds, Events, See more, Your shortcuts). */
export function LeftSidebar({user}: {user: User}) {
  return <aside style={{padding: 16}}>Left rail for {user.name}</aside>;
}
