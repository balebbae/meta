import type {Metadata} from 'next';
import Link from 'next/link';
import {getSessionUser} from '@/lib/auth';
import {listNotifications} from '@/lib/queries';
import {listEvents} from '@/lib/secondary-queries';
import {EVENT_CATEGORIES, matchesQuery} from '@/lib/secondary-data';
import {PanelHeader, PanelRow, PanelSearch, SecondaryLayout, SectionHead} from '@/components/pages/SecondaryLayout';
import {EventCard} from '@/components/pages/EventCard';
import {BellIcon, CalendarIcon, ChevronDownIcon, HomeIcon, PersonIcon, PinIcon, PlusIcon} from '@/components/pages/icons';
import panel from '@/components/pages/secondary.module.css';
import styles from '@/components/pages/events.module.css';

export const metadata: Metadata = {title: 'Events | Facebook'};
export const dynamic = 'force-dynamic';

export default async function EventsPage({searchParams}: {searchParams: Promise<{tab?: string; category?: string; q?: string}>}) {
  const {tab, category, q} = await searchParams;
  const user = await getSessionUser();
  const all = await listEvents(user?.id ?? 0);
  const yours = tab === 'yours';
  const events = (yours ? all.filter(e => e.viewerStatus) : all).filter(event =>
    matchesQuery(q, event.title, event.description, event.location) &&
    (!category || matchesQuery(category, event.title, event.description, event.location)),
  );
  const notes = tab === 'notifications' && user ? (await listNotifications(user.id)).filter(note => matchesQuery(q, note.message) && /event/i.test(`${note.type} ${note.message}`)) : [];
  return (
    <SecondaryLayout
      panel={
        <>
          <PanelHeader title="Events" settings={false} />
          <PanelSearch placeholder="Search events" />
          <PanelRow icon={<HomeIcon />} label="Home" href="/events" active={!tab} />
          <PanelRow icon={<PersonIcon />} label="Your events" href="/events?tab=yours" active={yours} trailing={<span className={styles.chev}><ChevronDownIcon /></span>} />
          <PanelRow icon={<BellIcon />} label="Notifications" href="/events?tab=notifications" active={tab === 'notifications'} />
          <button type="button" className={panel.panelButtonPrimary}>
            <PlusIcon size={16} />
            Create new event
          </button>
          <div className={styles.catTitle}>Categories</div>
          {EVENT_CATEGORIES.map(c => (
            <PanelRow key={c.name} icon={<span aria-hidden>{c.emoji}</span>} label={c.name} href={`/events?category=${encodeURIComponent(c.name)}`} active={category === c.name} />
          ))}
        </>
      }>
      <div className={styles.card} style={{padding: 16}}>
        <nav className={styles.tabs} aria-label="Events">
          <Link href="/events" className={!tab ? styles.tabOn : styles.tab}>Home</Link>
          <Link href="/events?tab=yours" className={yours ? styles.tabOn : styles.tab}>Your events</Link>
          <Link href="/events?tab=notifications" className={tab === 'notifications' ? styles.tabOn : styles.tab}>Notifications</Link>
        </nav>
        <SectionHead title={tab === 'notifications' ? 'Notifications' : category ? category : yours ? 'Your upcoming events' : 'Discover events'} />
        <div className={styles.chips}>
          <button type="button" className={styles.chip}>
            <PinIcon size={14} />
            My location
            <ChevronDownIcon size={12} />
          </button>
          <button type="button" className={styles.chip}>
            <CalendarIcon size={14} />
            Any date
            <ChevronDownIcon size={12} />
          </button>
          <span className={styles.chipActive}>Top</span>
          <button type="button" className={styles.chip}>Friends</button>
          <button type="button" className={styles.chip}>Following</button>
        </div>
        {tab === 'notifications' ? (
          notes.length === 0 ? <div className={styles.empty}>No event notifications.</div> : (
            <div className={styles.grid}>
              {notes.map(note => (
                <Link key={note.id} href={note.postId ? `/posts/${note.postId}` : '/notifications'} className={styles.card}>{note.message}</Link>
              ))}
            </div>
          )
        ) : events.length === 0 ? (
          <div className={styles.empty}>{yours ? "You haven't responded to any events yet." : 'No events nearby.'}</div>
        ) : (
          <div className={styles.grid}>
            {events.map(e => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </SecondaryLayout>
  );
}
