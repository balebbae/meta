'use client';

import {Map, MapMarker, MarkerContent, MarkerTooltip} from '@/components/ui/map';
import type {Nearby} from '@/lib/activities/home';
import h from './home.module.css';

/** The pins. Loaded with next/dynamic from EventsNearby so maplibre never lands in the server bundle. */
export default function EventMap({events, home, theme}: Nearby & {theme: 'light' | 'dark'}) {
  const pts = [...events.map(e => e.pin), home].filter(Boolean) as {lat: number; lng: number}[];
  const lngs = pts.map(p => p.lng);
  const lats = pts.map(p => p.lat);
  const pad = 0.02;
  return (
    <Map theme={theme} bounds={[[Math.min(...lngs) - pad, Math.min(...lats) - pad], [Math.max(...lngs) + pad, Math.max(...lats) + pad]]} fitBoundsOptions={{padding: 36, maxZoom: 13}} attributionControl={{compact: true}} dragRotate={false} pitchWithRotate={false} scrollZoom={false}>
      {home && (
        <MapMarker longitude={home.lng} latitude={home.lat}>
          <MarkerContent>
            <span className={`${h.pin} ${h.pinHome}`} aria-label="You" />
          </MarkerContent>
          <MarkerTooltip>You</MarkerTooltip>
        </MapMarker>
      )}
      {events.map(e =>
        e.pin ? (
          <MapMarker key={e.id} longitude={e.pin.lng} latitude={e.pin.lat}>
            <MarkerContent>
              <span className={h.pin} aria-label={e.title} />
            </MarkerContent>
            <MarkerTooltip>{e.title}</MarkerTooltip>
          </MapMarker>
        ) : null,
      )}
    </Map>
  );
}
