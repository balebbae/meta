'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {QuestCardPayload} from '@/lib/activities/types';
import type {QuestState} from '@/lib/rally/queries';
import {RallyAvatar} from '@/components/rally/Avatar';
import {BossArt} from '@/components/rally/BossArt';
import {LogMoveSheet} from '@/components/rally/LogMoveSheet';
import {rallyApi} from '@/components/rally/api';
import s from '@/components/rally/rally.module.css';
import type {CardProps} from './index';

/** quest_card: boss art, title, story, squad avatar strip, live HP bar, Open quest / Log a move. */
export default function QuestCard({message, conversation}: CardProps) {
  const p = message.payload as unknown as QuestCardPayload;
  const [state, setState] = useState<QuestState | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => rallyApi.state(p.questId).then(st => alive && setState(st)).catch(() => {});
    void load();
    const t = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [p.questId]);

  const hpMax = state?.quest.bossHp ?? p.bossHp ?? 0;
  const hpLeft = state?.quest.bossHpLeft ?? hpMax;
  const pct = hpMax ? Math.max(0, Math.min(100, (hpLeft / hpMax) * 100)) : 0;
  const members = state?.members ?? conversation.members.map(m => ({...m, gear: [] as string[]}));
  const level = state ? state.quest.spec.levels[state.levelDay - 1] : undefined;
  const me = state?.members.find(m => m.id === state.viewerId);

  return (
    <div className={s.questCard} role="group" aria-label={`Quest: ${p.title}`}>
      <div className={s.questHero}>
        <BossArt kind={state?.quest.bossKind ?? 'goblin'} name={p.bossName ?? p.title} size={84} down={hpMax > 0 && hpLeft <= 0} />
        <div style={{minWidth: 0}}>
          <div className={s.questTitle}>{p.title}</div>
          <p className={s.questStory}>{state?.quest.spec.story ?? (p.bossName ? `${p.bossName} has ${p.bossHp} HP. Every move counts.` : 'A new Rally quest for this chat.')}</p>
        </div>
      </div>
      <div className={s.questBody}>
        <div className={s.strip} aria-label="Squad">
          {members.slice(0, 6).map(m => (
            <RallyAvatar key={m.id} src={m.avatarUrl} name={m.name} gear={m.gear} size={36} />
          ))}
        </div>
        {p.template === 'boss' && hpMax > 0 && (
          <div style={{marginTop: 8}}>
            <div className={`${s.hp} ${pct < 10 ? s.hpLow : ''}`} role="progressbar" aria-valuenow={hpLeft} aria-valuemin={0} aria-valuemax={hpMax} aria-label="Boss HP">
              <div className={s.hpFill} style={{width: `${pct}%`}} />
            </div>
            <div className={s.hpLabel}>
              <span>{p.bossName}</span>
              <span>
                {hpLeft} / {hpMax} HP
              </span>
            </div>
          </div>
        )}
        {state && !state.museUsed && <span className={s.offline}>Muse offline · template quest</span>}
      </div>
      <div className={s.cardActions}>
        <Link href={`/activities/games/${p.questId}`} className={s.btn}>
          Open quest
        </Link>
        <button type="button" className={s.btnPrimary} onClick={() => setLogOpen(true)} disabled={state?.quest.status === 'completed'}>
          Log a move
        </button>
      </div>
      <LogMoveSheet questId={p.questId} open={logOpen} onClose={() => setLogOpen(false)} levelName={level?.name} exercises={level?.exercises.map(e => `${e.name}${e.reps ? ` ×${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`)} target={me?.target ?? null} onDone={() => rallyApi.state(p.questId).then(setState).catch(() => {})} />
    </div>
  );
}
