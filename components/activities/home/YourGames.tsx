'use client';

import Link from 'next/link';
import {MapPin, Plus} from 'lucide-react';
import {BossArt} from '@/components/rally/BossArt';
import type {MyGame} from '@/components/activities/DiscoverPage';
import h from './home.module.css';

/** Active quests and Turf games as a snap strip; the last tile starts a new one. */
export function YourGames({games, onStart}: {games: MyGame[]; onStart: () => void}) {
  return (
    <div className={h.strip} role="list" aria-label="Your games">
      {games.map(g => (
        <Link key={g.key} href={g.href} className={`${h.card} ${h.gameTile}`} role="listitem">
          <span className={h.gameArt}>{g.boss ? <BossArt kind={g.boss.kind} name={g.boss.name} size={64} /> : <MapPin size={26} />}</span>
          <span className={h.gameName}>{g.title}</span>
          <span className={h.gameSub}>{g.subtitle}</span>
        </Link>
      ))}
      <button type="button" className={`${h.card} ${h.gameTile} ${h.gameNew}`} onClick={onStart} role="listitem">
        <span className={h.gameArt}>
          <Plus size={26} />
        </span>
        <span className={h.gameName}>{games.length ? 'New game' : 'Start a game'}</span>
        <span className={h.gameSub}>From one sentence</span>
      </button>
    </div>
  );
}
