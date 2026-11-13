'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {QuestCardPayload} from '@/lib/activities/types';
import type {QuestState} from '@/lib/rally/queries';
import {RallyAvatar} from '@/components/rally/Avatar';
import {BossArt} from '@/components/rally/BossArt';
import {LogMoveSheet} from '@/components/rally/LogMoveSheet';
import {rallyApi} from '@/components/rally/api';
import {Contours} from '@/components/activities/home/Contours';
import h from '@/components/activities/home/home.module.css';
import type {CardProps} from './index';
import {MemberRing} from './MemberRing';
import c from './cards.module.css';

const KIND = {boss: 'Boss fight', relay: 'Relay', streak: 'Streak'};

/** quest_card: boss art on the contour shader, title, HP left as the one live number, a damage ring per squad member, Open quest / Log a move (ember). */
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
  const members = state?.members ?? conversation.members.map(m => ({...m, gear: [] as string[], damage: 0}));
  const best = Math.max(1, ...members.map(m => m.damage));
  const level = state ? state.quest.spec.levels[state.levelDay - 1] : undefined;
  const me = state?.members.find(m => m.id === state.viewerId);

  return (
    <div className={c.card} role="group" aria-label={`Quest: ${p.title}`}>
      <div className={c.hero}>
        <Contours className={c.heroShader} />
        <BossArt kind={state?.quest.bossKind ?? 'goblin'} name={p.bossName ?? p.title} size={76} down={hpMax > 0 && hpLeft <= 0} />
        <div className={c.heroText}>
          <p className={h.eyebrow}>
            {KIND[p.template]}
            {state ? ` · Day ${state.levelDay}` : ''}
          </p>
          <div className={c.title}>{p.title}</div>
          {p.template === 'boss' && hpMax > 0 && (
            <>
              <div className={c.live}>
                <b>{hpLeft}</b> / {hpMax} HP left
              </div>
              <div className={`${c.hp} ${pct < 10 ? c.hpLow : ''}`} role="progressbar" aria-valuenow={hpLeft} aria-valuemin={0} aria-valuemax={hpMax} aria-label={`${p.bossName ?? 'Boss'} HP`}>
                <div className={c.hpFill} style={{width: `${pct}%`}} />
              </div>
            </>
          )}
        </div>
      </div>
      <div className={c.cardBody}>
        <p className={c.story}>{state?.quest.spec.story ?? (p.bossName ? `${p.bossName} has ${p.bossHp} HP. Every move counts.` : 'A new Rally quest for this chat.')}</p>
        <div className={c.squad} aria-label="Squad">
          {members.slice(0, 6).map(m => (
            <MemberRing key={m.id} pct={(m.damage / best) * 100} label={`${m.name}: ${m.damage} damage`}>
              <RallyAvatar src={m.avatarUrl} name={m.name} gear={m.gear} size={34} />
            </MemberRing>
          ))}
        </div>
        {((state?.myReadiness && state.quest.status !== 'completed') || (state && !state.museUsed)) && (
          <div className={c.notes}>
            {state.myReadiness && state.quest.status !== 'completed' && (
              <span className={`${c.fit} ${state.myReadiness.fit === 'good' ? '' : c.fitStretch}`} title={state.myReadiness.note}>
                <span className={c.fitDot} aria-hidden="true" />
                {state.myReadiness.fit === 'good' ? 'Good match for you' : 'A stretch for you'}
              </span>
            )}
            {!state.museUsed && <span className={h.chip}>Muse offline · template quest</span>}
          </div>
        )}
      </div>
      <div className={c.cardActions}>
        <Link href={`/activities/games/${p.questId}`} className={`${h.pill} ${h.pillQuiet}`}>
          Open quest
        </Link>
        <button type="button" className={`${h.pill} ${h.pillBlue}`} onClick={() => setLogOpen(true)} disabled={state?.quest.status === 'completed'}>
          Log a move
        </button>
      </div>
      <LogMoveSheet questId={p.questId} open={logOpen} onClose={() => setLogOpen(false)} levelName={level?.name} exercises={level?.exercises.map(e => `${e.name}${e.reps ? ` ×${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`)} target={me?.target ?? null} onDone={() => rallyApi.state(p.questId).then(setState).catch(() => {})} />
    </div>
  );
}
