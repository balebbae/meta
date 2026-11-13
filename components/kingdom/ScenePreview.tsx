'use client';
/** Dev-only harness for the two real-life scenes: the same Arena and KingdomView the quest and Turf pages mount, fed by a timer instead of the server. */
import dynamic from 'next/dynamic';
import {gridDisk} from 'h3-js';
import {useEffect, useMemo, useRef, useState} from 'react';
import {castBoss, castHero} from '@/lib/kingdom/cast';
import {TURF_COLORS} from '@/lib/turf/colors';
import {arenaCells} from '@/lib/turf/engine';
import {KATY_TRAIL} from '@/lib/turf/fixtures';
import type {TurfPlayer} from '@/lib/turf/types';
import {WORLDS, WORLD_IDS, type WorldId} from '@/lib/kingdom/scenes/worlds';
import type {ArenaStrike} from './Arena';

const Arena = dynamic(() => import('./Arena'), {ssr: false});
const KingdomView = dynamic(() => import('@/components/turf/KingdomView'), {ssr: false});
const NAMES = ['Sahas Sharma', 'Maya Chen', 'Jordan Lee', 'Priya Patel'];
const PLAYERS: TurfPlayer[] = NAMES.map((name, i) => ({id: i + 1, name, avatarUrl: '', color: TURF_COLORS[i], status: 'accepted', isHost: i === 0}));
const ARENA = {center: KATY_TRAIL, radiusKm: 0.4}, HP = 480;

export function ScenePreview() {
  const boss = useMemo(() => castBoss('golem'), []), heroes = useMemo(() => PLAYERS.map((p, i) => ({id: p.id, name: p.name, cast: castHero(p.name, ['a', 'b', 'c'].slice(i))})), []);
  const grid = useMemo(() => arenaCells(ARENA), []), inArena = useMemo(() => new Set(grid), [grid]);
  const [strikes, setStrikes] = useState<ArenaStrike[]>([]), [hpLeft, setHpLeft] = useState(HP), [cells, setCells] = useState<[string, number][]>([]), [trail, setTrail] = useState<string[]>([]);
  const n = useRef(0), [world, setWorld] = useState<WorldId>('kingdom');
  useEffect(() => { const w = new URLSearchParams(location.search).get('world') as WorldId | null; if (w && WORLDS[w]) setWorld(w); }, []);
  useEffect(() => {
    const fight = setInterval(() => { // someone logs a set
      const s = {id: ++n.current, userId: 1 + Math.floor(Math.random() * 4), damage: 30 + Math.floor(Math.random() * 40), reps: 6 + Math.floor(Math.random() * 12), critical: Math.random() < 0.2};
      setStrikes((p) => [...p.slice(-10), s]); setHpLeft((h) => Math.max(0, h - s.damage));
    }, 3200);
    let turn = 0;
    const run = setInterval(() => { // someone closes a loop; player 1's own trail shows first
      const who = (turn++ % 4) + 1, loop = gridDisk(grid[Math.floor(Math.random() * grid.length)], 3).filter((c) => inArena.has(c)), claim = (): void => { setTrail([]); setCells((p) => [...new Map<string, number>([...p, ...loop.map((c) => [c, who] as [string, number])])]); };
      if (who === 1) { setTrail(loop.slice(-18)); setTimeout(claim, 1800); } else claim();
    }, 4200);
    return () => { clearInterval(fight); clearInterval(run); };
  }, [grid, inArena]);
  return (
    <main style={{maxWidth: 760, margin: '0 auto', padding: 16, display: 'grid', gap: 16}}>
      <h1 style={{margin: 0, fontSize: 20}}>Kingdom scene preview (dev only)</h1>
      <div role="group" aria-label="World" style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
        {WORLD_IDS.map((id) => <button key={id} type="button" aria-pressed={world === id} onClick={() => setWorld(id)} style={{fontWeight: world === id ? 700 : 400}}>{WORLDS[id].name}</button>)}
      </div>
      <section aria-label="Boss fight">
        <p style={{margin: '0 0 8px'}}>Boss fight · HP {hpLeft} / {HP} · {strikes.length ? `last: ${NAMES[strikes[strikes.length - 1].userId - 1]} ${strikes[strikes.length - 1].reps} reps` : 'waiting'}</p>
        <div style={{height: 380, borderRadius: 12, overflow: 'hidden'}}><Arena boss={boss} bossName="The Stone Giant" hp={HP} hpLeft={hpLeft} heroes={heroes} strikes={strikes} world={world} /></div>
      </section>
      <section aria-label="Territory run">
        <p style={{margin: '0 0 8px'}}>Territory run · {grid.length} cells · {PLAYERS.map((p) => `${p.name.split(' ')[0]} ${cells.filter(([, o]) => o === p.id).length}`).join(' · ')}</p>
        <div style={{aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden'}}><KingdomView arena={ARENA} players={PLAYERS} cells={cells} trail={trail} viewerId={1} world={world} /></div>
      </section>
    </main>
  );
}
