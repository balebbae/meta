import {notFound} from 'next/navigation';
import {CoachMode} from '@/components/activities/CoachMode';
import {DiscoverPage} from '@/components/activities/DiscoverPage';
import {Header} from '@/components/layout/Header';
import {LeftSidebar} from '@/components/layout/LeftSidebar';
import {MobileTabBar} from '@/components/layout/MobileTabBar';
import {RightSidebar} from '@/components/layout/RightSidebar';
import {MobileHeader} from '@/components/mobile/MobileHeader';
import styles from '@/components/layout/layout.module.css';
import * as fx from './fixtures';

/** Dev-only: the Activities redesign on fixture data, no database or sign-in. 404 in production builds. */
export default function ActivitiesPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <>
      <Header user={fx.user} />
      <MobileHeader />
      <div className={styles.shell}>
        <div className={styles.leftCol}>
          <LeftSidebar user={fx.user} />
        </div>
        <main className={styles.main}>
          <div className={styles.feedCol}>
            <CoachMode initialOn={false}>
              <DiscoverPage viewer={{id: fx.user.id, name: fx.user.name, avatarUrl: fx.user.avatarUrl}} data={fx.data} museActions={fx.museActions} listings={fx.listings} start={null} eventId={null} goal={fx.goal} games={fx.games} level={fx.level} progress={fx.progress} nearby={fx.nearby} />
            </CoachMode>
          </div>
        </main>
        <div className={styles.rightCol}>
          <RightSidebar user={fx.user} />
        </div>
      </div>
      <MobileTabBar user={fx.user} />
    </>
  );
}
