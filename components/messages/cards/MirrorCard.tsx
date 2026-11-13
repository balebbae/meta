'use client';
import {useEffect, useState} from 'react';
import type {MirrorCardPayload} from '@/lib/activities/types';
import type {MirrorState} from '@/lib/rally/mirror-store';
import {MirrorSheet} from '@/components/rally/MirrorSheet';
import {RallyAvatar} from '@/components/rally/Avatar';
import {mirrorTitle} from '@/lib/rally/mirror';
import s from '@/components/rally/rally.module.css';
import type {CardProps} from './index';

/** mirror_card: a dance/yoga Reel sent to the chat. Shows who has a score and opens Mirror Yoga / Mirror Dance. */
export default function MirrorCard({message, conversation}: CardProps) {
  const p = message.payload as unknown as MirrorCardPayload;
  const [state, setState] = useState<MirrorState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/mirror/${p.matchId}`)
        .then(r => (r.ok ? r.json() : null))
        .then(st => alive && st && setState(st))
        .catch(() => {});
    void load();
    const t = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [p.matchId, open]);

  const top = state?.scores[0];
  const done = state?.status === 'done';
  const winner = done ? state?.scores.find(x => x.userId === state.winnerId) : null;
  const title = mirrorTitle(p.mode);
  // the leader's Kingdom hero fronts the card: the winner, else the top score, else whoever sent the Reel
  const lead = winner ?? top ?? (message.sender ? {name: message.sender.name, avatarUrl: message.sender.avatarUrl} : null);

  return (
    <div className={s.questCard} role="group" aria-label={title}>
      <div className={s.questHero}>
        {lead && <RallyAvatar src={lead.avatarUrl} name={lead.name} state={done ? 'celebrate' : 'idle'} size={84} mvp={Boolean(winner)} />}
        <div style={{minWidth: 0}}>
          <div className={s.questTitle}>{title}</div>
          <p className={s.questStory}>{done ? (winner ? `${winner.name.split(' ')[0]} wins · ${winner.score}` : 'Finished') : p.mode === 'yoga' ? 'Hold each pose' : 'Hit each move'}</p>
        </div>
      </div>
      <div className={s.questBody}>
        <div className={s.strip} aria-label="Squad">
          {conversation.members.slice(0, 6).map(mm => (
            <RallyAvatar key={mm.id} src={mm.avatarUrl} name={mm.name} gear={[]} size={36} />
          ))}
        </div>
        {state && (
          <div className={s.hpLabel} style={{marginTop: 8}}>
            <span>
              {state.scores.length}/{state.members} played
            </span>
            <span>{top ? `Top: ${top.name.split(' ')[0]} ${top.score}` : state.targets ? 'Ready' : state.unreadable ? 'Can’t use this Reel' : 'Setting up…'}</span>
          </div>
        )}
        {state && !state.museUsed && state.steps && <span className={s.offline}>Muse offline</span>}
      </div>
      <div className={s.cardActions}>
        <button type="button" className={s.btnPrimary} onClick={() => setOpen(true)}>
          {done ? 'See scores' : state?.mine ? `Best ${state.mine.score} · Again` : 'Play'}
        </button>
      </div>
      {open && <MirrorSheet matchId={p.matchId} open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}
