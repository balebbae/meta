'use client';
import {gridDisk, latLngToCell} from 'h3-js';
import {useMemo, type MouseEvent} from 'react';
import {arenaCells, cellCenter, inArena, type Arena, type LatLng} from '@/lib/turf/engine';
import {cellsPath, project, unproject, viewBox} from './geo';
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

/** The arena as an SVG hex grid. No map tiles, no third-party keys: just H3 cells and their owners. */
export function HexMap({arena, cells = [], colors = {}, trail = [], trailColor, me, grid = 'full', onPick, label, className}: Props) {
  const key = `${arena.center.lat},${arena.center.lng},${arena.radiusKm}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gridPath = useMemo(() => cellsPath(arena, grid === 'full' ? arenaCells(arena) : coarseCells(arena)), [key, grid]);
  const owned = useMemo(() => {
    const by = new Map<number, string[]>();
    for (const [cell, owner] of cells) {
      const list = by.get(owner);
      if (list) list.push(cell);
      else by.set(owner, [cell]);
    }
    return [...by.entries()].map(([owner, list]) => ({owner, d: cellsPath(arena, list)}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trailPath = useMemo(() => (trail.length ? cellsPath(arena, trail) : ''), [trail, key]);
  const r = arena.radiusKm * 1000;
  const dot = me && inArena(me, arena) ? project(arena, me) : null;

  const pick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onPick) return;
    const box = e.currentTarget.getBoundingClientRect();
    const span = 2 * r * 1.04;
    onPick(unproject(arena, ((e.clientX - box.left) / box.width - 0.5) * span, ((e.clientY - box.top) / box.height - 0.5) * span));
  };

  return (
    <svg viewBox={viewBox(arena)} className={`${styles.map} ${onPick ? styles.mapPick : ''} ${className ?? ''}`} role="img" aria-label={label ?? 'Turf arena'} onClick={pick}>
      <circle cx={0} cy={0} r={r} className={styles.arena} />
      <path d={gridPath} className={grid === 'full' ? styles.grid : styles.gridCoarse} />
      {owned.map(o => (
        <path key={o.owner} d={o.d} fill={colors[o.owner] ?? 'var(--fb-text-secondary)'} className={styles.owned} />
      ))}
      {trailPath && <path d={trailPath} className={styles.trail} style={{stroke: trailColor, fill: trailColor}} />}
      <circle cx={0} cy={0} r={r} className={styles.arenaRing} />
      {onPick && <circle cx={0} cy={0} r={r * 0.035} className={styles.centerPin} />}
      {dot && (
        <g>
          <circle cx={dot[0]} cy={dot[1]} r={r * 0.045} className={styles.meHalo} />
          <circle cx={dot[0]} cy={dot[1]} r={r * 0.02} className={styles.meDot} />
        </g>
      )}
    </svg>
  );
}
