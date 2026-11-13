'use client';

import Link from 'next/link';
import {IconMapPin, IconPlus} from '@tabler/icons-react';
import {BossArt} from '@/components/rally/BossArt';
import {RallyAvatar} from '@/components/rally/Avatar';
import type {MyGame} from '@/components/activities/DiscoverPage';
import h from './home.module.css';

/** Active quests, Turf, Mirror and Castle Crossing games as a snap strip; the last tile starts a new one. */
export function YourGames({games, viewer, onStart}: {games: MyGame[]; viewer?: {name: string; avatarUrl: string}; onStart: () => void}) {
  return (
    <div className={h.strip} role="list" aria-label="Your games">
      {games.map(g => (
        <Link key={g.key} href={g.href} className={`${h.card} ${h.gameTile}`} role="listitem">
          <span className={h.gameArt}>{g.boss ? <BossArt kind={g.boss.kind} name={g.boss.name} size={64} /> : g.hero && viewer ? <RallyAvatar src={viewer.avatarUrl} name={viewer.name} state={g.hero} size={64} /> : <IconMapPin size={26} />}</span>
          <span className={h.gameName}>{g.title}</span>
          <span className={h.gameSub}>{g.subtitle}</span>
        </Link>
      ))}
      <button type="button" className={`${h.card} ${h.gameTile} ${h.gameNew}`} onClick={onStart} role="listitem">
        <span className={h.gameArt}>
          <IconPlus size={26} />
        </span>
        <span className={h.gameName}>New game</span>
      </button>
    </div>
  );
}
