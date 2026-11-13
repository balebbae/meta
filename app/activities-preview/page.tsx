import {CoachMode} from '@/components/activities/CoachMode';
import {DiscoverPage, SectionHead} from '@/components/activities/DiscoverPage';
import h from '@/components/activities/home/home.module.css';
import * as fx from './fixtures';
import {PreviewThread} from './PreviewThread';

/** Dev-only: the Activities redesign on fixture data, inside Activities mode (chrome from ./layout.tsx). */
export default function ActivitiesPreview() {
  return (
    <>
      <CoachMode initialOn={false}>
        <DiscoverPage viewer={{id: fx.user.id, name: fx.user.name, avatarUrl: fx.user.avatarUrl}} data={fx.data} museActions={fx.museActions} listings={fx.listings} start={null} eventId={null} goal={fx.goal} games={fx.games} level={fx.level} progress={fx.progress} nearby={fx.nearby} />
      </CoachMode>
      <section className={h.section} style={{padding: '0 12px 56px'}} aria-label="Challenges in Messages">
        <SectionHead title="Challenges in Messages" sub="The cards a squad chat gets" />
        <PreviewThread />
      </section>
    </>
  );
}
