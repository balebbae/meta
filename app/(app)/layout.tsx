import {redirect} from 'next/navigation';
import {ActivitiesMode} from '@/components/activities/home/ActivitiesMode';
import {Header} from '@/components/layout/Header';
import {LeftSidebar} from '@/components/layout/LeftSidebar';
import {MobileTabBar} from '@/components/layout/MobileTabBar';
import {MobileHeader} from '@/components/mobile/MobileHeader';
import {RightSidebar} from '@/components/layout/RightSidebar';
import {ComposeFab} from '@/components/layout/ComposeFab';
import {IncomingCall} from '@/components/messages/IncomingCall';
import {PushProvider} from '@/components/push/PushProvider';
import {getSessionUser} from '@/lib/auth';
import {listContacts} from '@/lib/queries';
import {listFriendRequests} from '@/lib/profile-queries';
import styles from '@/components/layout/layout.module.css';


export default async function AppLayout({children}: {children: React.ReactNode}) {
  const user = await getSessionUser();
  if (!user) redirect('/auth');
  const [contacts, requests] = await Promise.all([listContacts(user.id).catch(() => []), listFriendRequests(user.id).catch(() => [])]);
  return (
    <>
      <ActivitiesMode />
      <Header user={user} contacts={contacts} />
      <MobileHeader />
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
      <IncomingCall />
      <PushProvider userId={user.id} />
      <MobileTabBar user={user} />
    </>
  );
}
