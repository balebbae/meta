'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type {Nearby} from '@/lib/activities/home';
import h from './home.module.css';
import {useActTheme} from './useActTheme';

const EventMap = dynamic(() => import('./EventMap'), {ssr: false, loading: () => <div className={h.map} />});
// UTC on both sides so the server and client render the same day label
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', {day: 'numeric', timeZone: 'UTC'});
const mon = (iso: string) => new Date(iso).toLocaleDateString('en-US', {month: 'short', timeZone: 'UTC'});
const when = (iso: string) => new Date(iso).toLocaleString('en-US', {weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'UTC'});

/** In-person events this month with pins and distances. Only the list renders when nothing can be placed on the map. */
export function EventsNearby({events, home}: Nearby) {
  const theme = useActTheme();
  const mappable = events.some(e => e.pin);
  return (
    <div className={h.events} style={mappable ? undefined : {gridTemplateColumns: '1fr'}}>
      {mappable && (
        <div className={h.map}>
          <EventMap events={events} home={home} theme={theme} />
        </div>
      )}
      <div className={h.evList}>
        {events.map(e => (
          <Link key={e.id} href={`/events?id=${e.id}`} className={h.ev}>
            <span className={h.evDate}>
              <b>{day(e.startsAt)}</b>
              <span>{mon(e.startsAt)}</span>
            </span>
            <span style={{minWidth: 0}}>
              <span className={h.evTitle} style={{display: 'block'}}>
                {e.title}
              </span>
              <span className={h.evMeta} style={{display: 'block'}}>
                {when(e.startsAt)} · {e.location}
              </span>
            </span>
            {e.distanceKm != null && <span className={h.evDist}>{e.distanceKm < 1 ? '<1 km' : `${Math.round(e.distanceKm)} km`}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
