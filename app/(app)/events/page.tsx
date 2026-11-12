import type {Metadata} from 'next';
import {getSessionUser} from '@/lib/auth';
import {listEvents} from '@/lib/secondary-queries';
import {PanelDivider, PanelHeader, PanelRow, PanelSearch, SecondaryLayout, SectionHead} from '@/components/pages/SecondaryLayout';
import {EventCard} from '@/components/pages/EventCard';
import {BellIcon, CakeIcon, CalendarIcon, HomeIcon, PlusIcon} from '@/components/pages/icons';
import panel from '@/components/pages/secondary.module.css';
import styles from '@/components/pages/events.module.css';

export const metadata: Metadata = {title: 'Events | Facebook'};
export const dynamic = 'force-dynamic';

export default async function EventsPage({searchParams}: {searchParams: Promise<{tab?: string}>}) {
  const {tab} = await searchParams;
  const user = await getSessionUser();
  const all = await listEvents(user?.id ?? 0);
  const yours = tab === 'yours';
  const events = yours ? all.filter(e => e.viewerStatus) : all;
  return (
    <SecondaryLayout
      panel={
        <>
          <PanelHeader title="Events" />
          <PanelSearch placeholder="Search events" />
          <PanelRow icon={<HomeIcon />} label="Home" href="/events" active={!tab} />
          <PanelRow icon={<CalendarIcon />} label="Your events" href="/events?tab=yours" active={yours} chevron />
          <PanelRow icon={<CakeIcon />} label="Birthdays" href="/events?tab=birthdays" active={tab === 'birthdays'} />
          <PanelRow icon={<BellIcon />} label="Notifications" href="/events?tab=notifications" active={tab === 'notifications'} />
          <button type="button" className={panel.panelButton}>
            <PlusIcon size={16} />
            Create new event
          </button>
          <PanelDivider />
        </>
      }>
      <SectionHead title={yours ? 'Your upcoming events' : 'Discover events'} />
      {events.length === 0 ? (
        <div className={styles.empty}>{yours ? "You haven't responded to any events yet." : 'No events nearby.'}</div>
      ) : (
        <div className={styles.grid}>
          {events.map(e => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </SecondaryLayout>
  );
}
