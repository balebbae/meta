import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ActivitiesMode} from '@/components/activities/home/ActivitiesMode';
import {Header} from '@/components/layout/Header';
import {LeftSidebar} from '@/components/layout/LeftSidebar';
import {MobileTabBar} from '@/components/layout/MobileTabBar';
import {RightSidebar} from '@/components/layout/RightSidebar';
import {MobileHeader} from '@/components/mobile/MobileHeader';
import styles from '@/components/layout/layout.module.css';
import * as fx from './fixtures';
import {PreviewFetch} from './PreviewFetch';

/** Dev-only: the app chrome on fixture data, no database or sign-in (same shape as app/(app)/layout.tsx). 404 in
 *  production builds. /activities-preview is inside Activities mode, /activities-preview/feed is outside it, so
 *  moving between the two shows the chrome re-tint and restore. */
export default function PreviewLayout({children}: {children: React.ReactNode}) {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <>
      <PreviewFetch />
      <ActivitiesMode />
      <Header user={fx.user} contacts={fx.contacts} />
      <MobileHeader />
      <div className={styles.shell}>
        <div className={styles.leftCol}>
          <LeftSidebar user={fx.user} />
        </div>
        <main className={styles.main}>
          <div className={styles.feedCol}>
            <p className="fb-text-secondary" style={{margin: 0, padding: '0 4px 8px', fontSize: 13}}>
              Dev preview: <Link href="/activities-preview" style={{color: 'var(--fb-blue)'}}>Activities</Link> · <Link href="/activities-preview/feed" style={{color: 'var(--fb-blue)'}}>Facebook feed</Link>
            </p>
            {children}
          </div>
        </main>
        <div className={styles.rightCol}>
          <RightSidebar user={fx.user} contacts={fx.contacts} requests={fx.requests} />
        </div>
      </div>
      <MobileTabBar user={fx.user} />
    </>
  );
}
