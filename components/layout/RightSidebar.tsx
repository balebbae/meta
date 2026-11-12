import type {User} from '@/lib/types';

/** Feed-UI subagent: replace with the Facebook right rail (Sponsored, Birthdays, Contacts with online dots, Group conversations). */
export function RightSidebar({user}: {user: User}) {
  return <aside style={{padding: 16}}>Right rail for {user.name}</aside>;
}
