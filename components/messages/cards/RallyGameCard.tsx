'use client';
import Link from 'next/link';
import type {RallyGamePayload} from '@/lib/activities/types';
import {RallyAvatar, type AvatarState} from '@/components/rally/Avatar';
import h from '@/components/activities/home/home.module.css';
import type {CardProps} from './index';
import c from './cards.module.css';

const STATE: Record<RallyGamePayload['event'], AvatarState> = {move: 'attack', critical: 'attack', boss_low: 'attack', dare: 'run', level: 'celebrate', boss_down: 'celebrate'};
const BIG: Record<string, string> = {critical: 'Critical hit!', boss_low: 'Boss is almost down!', level: 'Level cleared!', boss_down: 'Boss defeated!'};

/** rally_game: the acting player's avatar animating + Game Master speech bubble, the hit in ember. Big moments get a full-width card on the wash. */
export default function RallyGameCard({message, conversation}: CardProps) {
  const p = message.payload as unknown as RallyGamePayload;
  const actor = conversation.members.find(m => m.id === p.userId) ?? (message.sender ? {...message.sender} : null);
  const big = p.event in BIG;
  return (
    <Link href={`/activities/games/${p.questId}`} className={`${c.game} ${big ? c.gameBig : ''} ${p.event === 'boss_down' ? c.gameDown : ''}`} style={{textDecoration: 'none'}} aria-label={`Rally: ${p.text}`}>
      {actor && <RallyAvatar src={actor.avatarUrl} name={actor.name} state={STATE[p.event] ?? 'idle'} size={big ? 72 : 48} />}
      <div className={c.gm}>
        <p className={h.eyebrow}>Game Master</p>
        {big && <p className={c.title}>{BIG[p.event]}</p>}
        {p.text}
        {!!p.damage && (
          <div className={`${c.live} ${c.liveSm}`}>
            <b>−{p.damage}</b>
            {p.hpLeft != null && `${p.hpLeft} HP left`}
          </div>
        )}
      </div>
    </Link>
  );
}
