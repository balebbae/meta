'use client';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {QuestState} from '@/lib/rally/queries';
import {RallyAvatar, type AvatarState} from './Avatar';
import {BossArt} from './BossArt';
import {LogMoveSheet} from './LogMoveSheet';
import {rallyApi, type OkMove} from './api';
import s from './dashboard.module.css';
import r from './rally.module.css';

const POLL_MS = 3000;

/** §17.2 dashboard: Quest map, Boss arena (polls state every 3s), Locker, Squad stats, Log a move / Do a dare. */
export function QuestDashboard({initial}: {initial: QuestState}) {
  const [state, setState] = useState<QuestState>(initial);
  const [logOpen, setLogOpen] = useState(false);
  const [dare, setDare] = useState<QuestState['dares'][number] | null>(null);
  const [anim, setAnim] = useState<{userId: number; state: AvatarState; hurt: boolean} | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const lastMoveId = useRef(initial.moves[initial.moves.length - 1]?.id ?? 0);

  const refresh = useCallback(async () => {
    try {
      const next = await rallyApi.state(initial.quest.id);
      const newest = next.moves[next.moves.length - 1];
      if (newest && newest.id > lastMoveId.current) {
        lastMoveId.current = newest.id;
        setAnim({userId: newest.userId, state: next.quest.status === 'completed' ? 'celebrate' : 'attack', hurt: true});
        setTimeout(() => setAnim(null), 1800);
      }
      setState(next);
    } catch {
      /* keep last good state */
    }
  }, [initial.quest.id]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const onMove = (res: OkMove) => {
    setBanner(res.narration);
    setTimeout(() => setBanner(null), 5000);
    void refresh();
  };

  const q = state.quest;
  const spec = q.spec;
  const hpPct = q.bossHp ? Math.max(0, Math.min(100, (q.bossHpLeft / q.bossHp) * 100)) : 0;
  const done = q.status === 'completed';
  const me = state.members.find(m => m.id === state.viewerId);
  const level = spec.levels[state.levelDay - 1];
  const myRewards = state.rewards.filter(x => x.userId === state.viewerId);
  const claim = async (id: number) => {
    try {
      await rallyApi.claim(id);
      void refresh();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={s.page}>
      {banner && (
        <div className={s.banner} role="status">
          <strong>Game Master:</strong> {banner}
        </div>
      )}

      {/* Boss arena */}
      <section className={`${s.card} ${s.arena}`} aria-label="Boss arena">
        <div className={s.arenaHead}>
          <div>
            <h1 className={s.h1}>{q.title}</h1>
            <p className={s.muted}>{spec.story}</p>
            <div className={s.tags}>
              <span className={s.tag}>{spec.template}</span>
              <span className={s.tag}>Day {state.levelDay} of {spec.levels.length}</span>
              {q.buffed && <span className={s.tag}>Boss buffed +10%</span>}
              {!state.museUsed && <span className={r.offline}>Muse offline · template quest</span>}
            </div>
          </div>
          {q.conversationId && (
            <Link href={`/messages/${q.conversationId}`} className="fb-btn-secondary" style={{whiteSpace: 'nowrap'}}>
              Open chat
            </Link>
          )}
        </div>
        {spec.boss && (
          <div className={s.arenaStage}>
            <div className={s.bossSlot}>
              <BossArt kind={q.bossKind} imageUrl={q.bossImageUrl} name={spec.boss.name} size={150} hurt={Boolean(anim?.hurt)} down={done} />
              <div className={s.bossName}>{spec.boss.name}</div>
              <div className={`${r.hp} ${hpPct < 10 && !done ? r.hpLow : ''}`} role="progressbar" aria-valuenow={q.bossHpLeft} aria-valuemin={0} aria-valuemax={q.bossHp} aria-label="Boss HP">
                <div className={r.hpFill} style={{width: `${hpPct}%`}} />
              </div>
              <div className={r.hpLabel}>
                <span>{done ? 'Defeated' : `${Math.round(hpPct)}%`}</span>
                <span>
                  {q.bossHpLeft} / {q.bossHp} HP
                </span>
              </div>
            </div>
            <div className={s.squad} aria-label="Squad">
              {state.members.map(m => (
                <div key={m.id} className={s.squadMember}>
                  <RallyAvatar src={m.avatarUrl} name={m.name} gear={m.gear} size={64} mvp={state.mvp === m.id} state={anim?.userId === m.id ? anim.state : done ? 'celebrate' : 'idle'} />
                  <span className={s.squadName}>{m.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {q.template === 'relay' && (
          <div className={s.relay}>
            {(['A', 'B'] as const).map(t => (
              <div key={t} className={s.relayLane}>
                <span>Team {t}</span>
                <div className={r.hp}>
                  <div className={r.hpFill} style={{width: `${(state.relay.legs[t] / state.relay.totalLegs) * 100}%`, background: t === 'A' ? 'var(--fb-blue)' : 'var(--fb-green)'}} />
                </div>
                <span className={s.muted}>
                  {state.relay.legs[t]}/{state.relay.totalLegs} legs
                </span>
              </div>
            ))}
            {state.relay.winner && <p className={s.muted}>Winner: {state.relay.winner === 'tie' ? 'tie' : `Team ${state.relay.winner}`}</p>}
          </div>
        )}
        <div className={s.actions}>
          <button type="button" className="fb-btn-primary" disabled={done} onClick={() => setLogOpen(true)}>
            Log a move
          </button>
          <button type="button" className="fb-btn-secondary" disabled={done || !state.dares.length} onClick={() => setDare(state.dares.find(d => !d.doneBy.includes(state.viewerId)) ?? state.dares[0])}>
            Do a dare
          </button>
        </div>
        {me && level && !done && (
          <p className={s.muted} style={{marginTop: 8}}>
            Today: {level.name} · {level.exercises.map(e => `${e.name}${e.reps ? ` ×${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`).join(', ')}
            {me.target != null && <> · your target {me.target}</>}
          </p>
        )}
        {(state.fairness || state.myHandicap) && (
          <div className={s.fairPlay}>
            <div className={s.fairPlayHead}>
              <span className={s.h3}>Fair play</span>
              {state.fairness && <span className={s.fairBadge}>Predicted finish: {state.fairness.label}</span>}
            </div>
            {state.fairness?.summary && <p className={s.muted}>{state.fairness.summary}</p>}
            {state.myHandicap && (
              <p className={s.muted}>
                <strong>Only you see this:</strong> target ×{state.myHandicap.targetScale}, each move hits ×{state.myHandicap.damageScale}
                {state.myHandicap.why ? `. ${state.myHandicap.why}` : '.'}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Quest map */}
      <section className={s.card} aria-label="Quest map">
        <h2 className={s.h2}>Quest map</h2>
        <ol className={s.map}>
          {spec.levels.map((l, i) => {
            const here = state.members.filter(m => m.level === l.day);
            const reached = l.day <= state.levelDay;
            return (
              <li key={l.day} className={`${s.node} ${reached ? s.nodeReached : ''} ${l.day === state.levelDay ? s.nodeNow : ''}`}>
                {i < spec.levels.length - 1 && <span className={s.path} aria-hidden />}
                <div className={s.nodeAvatars}>
                  {here.map(m => (
                    <RallyAvatar key={m.id} src={m.avatarUrl} name={m.name} gear={m.gear} size={28} state={l.day === state.levelDay && !done ? 'run' : 'idle'} />
                  ))}
                </div>
                <span className={s.nodeDot}>{l.day}</span>
                <div className={s.nodeText}>
                  <strong>{l.name}</strong>
                  <small>{l.exercises.map(e => `${e.name}${e.reps ? ` ×${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`).join(' · ')}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={s.twoCol}>
        {/* Squad stats */}
        <section className={s.card} aria-label="Squad stats">
          <h2 className={s.h2}>Squad</h2>
          <ul className={s.stats}>
            {[...state.members].sort((a, b) => b.damage - a.damage).map(m => (
              <li key={m.id} className={s.statRow}>
                <RallyAvatar src={m.avatarUrl} name={m.name} gear={m.gear} size={32} />
                <div style={{flex: 1, minWidth: 0}}>
                  <div className={s.statName}>
                    {m.name}
                    {state.mvp === m.id && <span className={s.mvp}>MVP</span>}
                    {m.team && <span className={s.tag}>Team {m.team}</span>}
                  </div>
                  <div className={s.muted}>
                    {m.moves} {m.moves === 1 ? 'move' : 'moves'} · {m.damage} dmg
                    {state.streak[m.id] && <> · streak {state.streak[m.id].streak} · {state.streak[m.id].livesLeft} lives</>}
                  </div>
                </div>
                <div className={s.statBar}>
                  <div style={{width: `${state.members.reduce((mx, x) => Math.max(mx, x.damage), 0) ? (m.damage / state.members.reduce((mx, x) => Math.max(mx, x.damage), 1)) * 100 : 0}%`}} />
                </div>
              </li>
            ))}
          </ul>
          <h3 className={s.h3}>Dares</h3>
          <ul className={s.dares}>
            {state.dares.map(d => (
              <li key={d.id} className={s.dareRow}>
                <div style={{flex: 1}}>
                  <div>{d.text}</div>
                  <div className={s.muted}>
                    +{d.bonus} bonus{d.needsProof ? ' · photo' : ''}
                    {d.doneBy.length > 0 && <> · done by {d.doneBy.map(id => state.members.find(m => m.id === id)?.name.split(' ')[0] ?? '?').join(', ')}</>}
                  </div>
                </div>
                <button type="button" className="fb-btn-secondary" disabled={done || d.doneBy.includes(state.viewerId)} onClick={() => setDare(d)}>
                  {d.doneBy.includes(state.viewerId) ? 'Done' : 'Do it'}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Locker + rewards */}
        <section className={s.card} aria-label="Locker">
          <h2 className={s.h2}>Locker</h2>
          {me && (
            <div className={s.lockerHero}>
              <RallyAvatar src={me.avatarUrl} name={me.name} gear={me.gear} size={96} state={done ? 'celebrate' : 'idle'} />
              <div>
                <div className={s.statName}>Your gear</div>
                {state.gear.filter(g => g.userId === me.id).length ? (
                  <div className={s.chips}>
                    {state.gear.filter(g => g.userId === me.id).map(g => (
                      <span key={g.slug} className={s.tag} title={g.description ?? ''}>
                        {g.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={s.muted}>Beat the boss to unlock gear for everyone.</p>
                )}
              </div>
            </div>
          )}
          <h3 className={s.h3}>Rewards</h3>
          {myRewards.length === 0 ? (
            <ul className={s.rewards}>
              {spec.rewards.map((rw, i) => (
                <li key={i} className={`${s.reward} ${s.rewardLocked}`}>
                  <span className={s.tag}>{rw.tier}</span>
                  <span>{rw.label}</span>
                  <span className={s.muted}>locked</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={s.rewards}>
              {myRewards.map(rw => (
                <li key={rw.id} className={s.reward}>
                  <span className={s.tag}>{rw.tier}</span>
                  <div style={{flex: 1}}>
                    <div>{rw.label}</div>
                    {rw.sponsor && (
                      <div className={s.muted}>
                        <span className={s.sponsored}>Sponsored</span> {rw.sponsor}
                        {rw.tier === 'equipment' && ' · 18+ only, demo offer'}
                      </div>
                    )}
                    {rw.status === 'claimed' && rw.code && <div className={s.code}>{rw.code}</div>}
                  </div>
                  <button type="button" className={rw.status === 'claimed' ? 'fb-btn-secondary' : 'fb-btn-primary'} disabled={rw.status === 'claimed'} onClick={() => void claim(rw.id)}>
                    {rw.status === 'claimed' ? 'Claimed' : 'Claim'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {state.listings.length > 0 && (
            <>
              <h3 className={s.h3}>Gear for your next quest</h3>
              <div className={s.listings}>
                {state.listings.map(l => (
                  <Link key={l.id} href={`/marketplace/${l.id}`} className={s.listing}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.imageUrl} alt="" />
                    <div className={s.listingTitle}>{l.title}</div>
                    <div className={s.muted}>${(l.priceCents / 100).toFixed(0)} · {l.location}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Recent moves */}
      <section className={s.card} aria-label="Recent moves">
        <h2 className={s.h2}>Recent moves</h2>
        {state.moves.length === 0 ? (
          <p className={s.muted}>No moves yet. Be the first to hit the boss.</p>
        ) : (
          <ul className={s.moves}>
            {[...state.moves].reverse().slice(0, 12).map(m => {
              const who = state.members.find(x => x.id === m.userId);
              return (
                <li key={m.id} className={s.moveRow}>
                  <RallyAvatar src={who?.avatarUrl ?? ''} name={who?.name ?? ''} gear={who?.gear ?? []} size={28} />
                  <span style={{flex: 1}}>
                    <strong>{who?.name.split(' ')[0] ?? 'Someone'}</strong> {m.kind === 'dare' ? 'completed a dare' : 'hit the boss'} for <strong>{m.damage}</strong>
                    {m.hasProof && <span className={s.tag} style={{marginLeft: 6}}>{m.proofStatus === 'pending' ? 'proof pending' : m.proofStatus === 'approved' ? 'proof ✓' : 'photo'}</span>}
                  </span>
                  <span className={s.muted}>{new Date(m.createdAt).toLocaleDateString(undefined, {weekday: 'short', hour: 'numeric', minute: '2-digit'})}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <LogMoveSheet questId={q.id} open={logOpen} onClose={() => setLogOpen(false)} levelName={level?.name} exercises={level?.exercises.map(e => `${e.name}${e.reps ? ` ×${e.reps}` : ''}${e.seconds ? ` ${e.seconds}s` : ''}`)} target={me?.target ?? null} onDone={onMove} />
      <LogMoveSheet questId={q.id} open={Boolean(dare)} onClose={() => setDare(null)} dare={dare} onDone={onMove} />
    </div>
  );
}
