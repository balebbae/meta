'use client';
import {gridDisk, latLngToCell} from 'h3-js';
import {useEffect, useMemo, useState} from 'react';
import {Map, MapControls, MapGeoJSON, MapMarker, MarkerContent, useMap} from '@/components/ui/map';
import {arenaCells, cellCenter, inArena, type Arena, type LatLng} from '@/lib/turf/engine';
import {arenaBounds, arenaRing, cellsGeometry} from './geo';
import styles from './turf.module.css';

type Props = {
  arena: Arena;
  /** [cell, ownerId] */
  cells?: [string, number][];
  colors?: Record<number, string>;
  /** The viewer's own open trail (cells). Never anyone else's. */
  trail?: string[];
  trailColor?: string;
  /** The viewer's own position, from their own device. */
  me?: LatLng | null;
  /** 'full' draws every res-11 cell; 'preview' a coarse grid for cards and pickers. */
  grid?: 'full' | 'preview';
  onPick?: (p: LatLng) => void;
  label?: string;
  className?: string;
};

function coarseCells(arena: Arena): string[] {
  const res = arena.radiusKm > 1 ? 9 : 10;
  const origin = latLngToCell(arena.center.lat, arena.center.lng, res);
  return gridDisk(origin, res === 9 ? 6 : 8).filter(c => inArena(cellCenter(c), arena));
}

/** MapLibre paints can't read CSS variables, so resolve the Facebook tokens once the map is up (and again on theme change). */
function useFbColors() {
  const {resolvedTheme} = useMap();
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    return {blue: v('--fb-blue'), secondary: v('--fb-text-secondary'), card: v('--fb-card')};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);
}

function ClickToPick({onPick}: {onPick: (p: LatLng) => void}) {
  const {map, isLoaded} = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';
    const handle = (e: {lngLat: {lat: number; lng: number}}) => onPick({lat: e.lngLat.lat, lng: e.lngLat.lng});
    map.on('click', handle);
    return () => {
      map.off('click', handle);
      canvas.style.cursor = '';
    };
  }, [map, isLoaded, onPick]);
  return null;
}

/** Keep the arena framed when its centre or radius changes after mount. */
function FitArena({arena}: {arena: Arena}) {
  const {map, isLoaded} = useMap();
  const key = `${arena.center.lat},${arena.center.lng},${arena.radiusKm}`;
  useEffect(() => {
    if (map && isLoaded) map.fitBounds(arenaBounds(arena), {duration: 300});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, key]);
  return null;
}

function Layers({arena, cells, colors, trail, trailColor, me, grid, onPick}: Required<Pick<Props, 'arena' | 'cells' | 'colors' | 'trail' | 'grid'>> & Pick<Props, 'trailColor' | 'me' | 'onPick'>) {
  const fb = useFbColors();
  const key = `${arena.center.lat},${arena.center.lng},${arena.radiusKm}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gridGeo = useMemo(() => cellsGeometry(grid === 'full' ? arenaCells(arena) : coarseCells(arena)), [key, grid]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ring = useMemo(() => arenaRing(arena), [key]);
  const owned = useMemo<GeoJSON.FeatureCollection>(() => {
    const by = new globalThis.Map<number, string[]>();
    for (const [cell, owner] of cells) {
      const list = by.get(owner);
      if (list) list.push(cell);
      else by.set(owner, [cell]);
    }
    return {
      type: 'FeatureCollection',
      features: [...by.entries()].map(([owner, list]) => ({type: 'Feature', properties: {color: colors[owner] ?? fb.secondary}, geometry: cellsGeometry(list)})),
    };
  }, [cells, colors, fb]);
  const trailGeo = useMemo(() => cellsGeometry(trail), [trail]);
  const dot = me && inArena(me, arena) ? me : null;
  const tc = trailColor ?? fb.blue;

  return (
    <>
      <MapGeoJSON id="turf-arena" data={{type: 'Polygon', coordinates: [ring]}} fillPaint={{'fill-color': fb.card, 'fill-opacity': 0.25}} linePaint={{'line-color': fb.secondary, 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': 0.7}} />
      <MapGeoJSON id="turf-grid" data={gridGeo} fillPaint={false} linePaint={{'line-color': fb.secondary, 'line-width': grid === 'full' ? 0.4 : 0.8, 'line-opacity': 0.45}} />
      <MapGeoJSON id="turf-owned" data={owned} fillPaint={{'fill-color': ['get', 'color'], 'fill-opacity': 0.6}} linePaint={{'line-color': fb.card, 'line-width': 0.5}} />
      {trail.length > 0 && <MapGeoJSON id="turf-trail" data={trailGeo} fillPaint={{'fill-color': tc, 'fill-opacity': 0.28}} linePaint={{'line-color': tc, 'line-width': 2, 'line-dasharray': [2, 1.5]}} />}
      {onPick && (
        <MapMarker longitude={arena.center.lng} latitude={arena.center.lat}>
          <MarkerContent>
            <span className={styles.pin} />
          </MarkerContent>
        </MapMarker>
      )}
      {dot && (
        <MapMarker longitude={dot.lng} latitude={dot.lat}>
          <MarkerContent>
            <span className={styles.meMarker} />
          </MarkerContent>
        </MapMarker>
      )}
      {onPick && <ClickToPick onPick={onPick} />}
      <FitArena arena={arena} />
    </>
  );
}

/** The arena on a mapcn (MapLibre + CARTO) street map, with H3 cells and their owners drawn on top. */
export function HexMap({arena, cells = [], colors = {}, trail = [], trailColor, me, grid = 'full', onPick, label, className}: Props) {
  const [initialBounds] = useState(() => arenaBounds(arena));
  const interactive = grid === 'full' || !!onPick;
  return (
    <div className={`${styles.map} ${className ?? ''}`} role="img" aria-label={label ?? 'Turf arena'}>
      <Map bounds={initialBounds} interactive={interactive} attributionControl={{compact: true}} dragRotate={false} pitchWithRotate={false}>
        <Layers arena={arena} cells={cells} colors={colors} trail={trail} trailColor={trailColor} me={me} grid={grid} onPick={onPick} />
        {grid === 'full' && <MapControls position="top-right" />}
      </Map>
    </div>
  );
}
