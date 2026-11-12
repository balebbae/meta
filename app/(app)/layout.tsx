import {redirect} from 'next/navigation';
import {Header} from '@/components/layout/Header';
import {LeftSidebar} from '@/components/layout/LeftSidebar';
import {MobileTabBar} from '@/components/layout/MobileTabBar';
import {RightSidebar} from '@/components/layout/RightSidebar';
import {ComposeFab} from '@/components/layout/ComposeFab';
import {PushProvider} from '@/components/push/PushProvider';
import {getSessionUser} from '@/lib/auth';
import {listContacts} from '@/lib/queries';
import {listFriendRequests} from '@/lib/profile-queries';
import styles from '@/components/layout/layout.module.css';

const THEME_SCRIPT = `try{var t=localStorage.getItem('fb.theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='dark';}catch(e){}`;

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [contacts, requests] = await Promise.all([listContacts(user.id).catch(() => []), listFriendRequests(user.id).catch(() => [])]);
  return (
    <>
      <script dangerouslySetInnerHTML={{__html: THEME_SCRIPT}} />
      <Header user={user} contacts={contacts} />
      <div className={styles.shell}>
        <div className={styles.leftCol}>
          <LeftSidebar user={user} />
        </div>
        <main className={styles.main}>
          <div className={styles.feedCol}>{children}</div>
        </main>
        <div className={styles.rightCol}>
          <RightSidebar user={user} contacts={contacts} requests={requests} />
        </div>
      </div>
      <ComposeFab />
      <PushProvider userId={user.id} />
      <MobileTabBar />
    </>
  );
}
