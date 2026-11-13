'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import SmartImage from '@/components/ui/SmartImage';
import {componentStatus, type ComponentStatus} from '@/lib/activities/goal-plan';
import type {Goal, GoalMatches} from '@/lib/activities/goals';
import g from './goals.module.css';

const json = (method: string, body: unknown) => ({method, headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

const STATUS_PILL: Record<ComponentStatus, {cls: string; label: string}> = {
  ready: {cls: g.pillGreen, label: 'Ready'},
  training: {cls: g.pillBlue, label: 'Training'},
  later: {cls: g.pill, label: 'Later'},
};

const CHECKIN_PILL = {ahead: {cls: g.pillGreen, label: 'Ahead'}, on_track: {cls: g.pillBlue, label: 'On track'}, behind: {cls: g.pillRed, label: 'Behind'}} as const;

function formatDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function GoalRoadmap({goal: initial, matches}: {goal: Goal; matches: GoalMatches}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {plan, week, progress} = goal;
  const current = plan.phases.find(p => week >= p.startWeek && week <= p.endWeek) ?? plan.phases[0];
  const next = plan.milestones.find(m => !m.done);
  const weeksLeft = Math.max(0, plan.weeks - week);

  const run = async (key: string, fn: () => Promise<Response>, onOk: (d: Record<string, unknown>) => void) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fn();
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((d.error as string) ?? 'Something went wrong. Try again.');
      onOk(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string, done: boolean) => run(`m-${id}`, () => fetch(`/api/goals/${goal.id}`, json('PATCH', {milestoneId: id, done})), d => setGoal(d.goal as Goal));
  const checkIn = () => run('checkin', () => fetch(`/api/goals/${goal.id}/checkin`, json('POST', {})), d => setGoal(d.goal as Goal));
  const play = (conversationId?: number) =>
    run(conversationId ? `chat-${conversationId}` : 'solo', () => fetch(`/api/goals/${goal.id}/game`, json('POST', conversationId ? {conversationId} : {})), d => router.push(String(d.url)));

  const total = plan.weeks;
  const hereLeft = ((week - 0.5) / total) * 100;

  return (
    <div className={g.page}>
      <nav className={g.muted}>
        <Link href="/activities/goals">Goals</Link> · {goal.title}
      </nav>

      <section className={g.card} aria-labelledby="goal-title">
        <div className={g.head} style={{marginBottom: 4}}>
          <h1 id="goal-title" className={g.h1}>
            {goal.title}
          </h1>
          {goal.status === 'done' ? <span className={g.pillGreen}>Goal reached</span> : <span className={g.pillBlue}>{current.name} phase</span>}
        </div>
        <p className={g.muted}>{plan.summary}</p>
        <div className={g.stats}>
          <div className={g.stat}>
            <span className={g.statValue}>
              {week}/{plan.weeks}
            </span>
            <span className={g.statLabel}>week</span>
          </div>
          <div className={g.stat}>
            <span className={g.statValue}>{weeksLeft}</span>
            <span className={g.statLabel}>{weeksLeft === 1 ? 'week to go' : 'weeks to go'}</span>
          </div>
          <div className={g.stat}>
            <span className={g.statValue}>
              {progress.done}/{progress.total}
            </span>
            <span className={g.statLabel}>milestones</span>
          </div>
          {goal.eventDate && (
            <div className={g.stat}>
              <span className={g.statValue}>{formatDate(goal.eventDate)}</span>
              <span className={g.statLabel}>goal date</span>
            </div>
          )}
        </div>
        <div className={g.bar} role="progressbar" aria-label="Milestones done" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct}>
          <div className={g.barFill} style={{width: `${progress.pct}%`}} />
        </div>
        {!goal.museUsed && <p className={g.disclaimer} style={{marginTop: 8}}>Muse was offline, so this is the standard plan. It still adapts as you tick milestones.</p>}
      </section>

      {error && (
        <p className={g.error} role="alert">
          {error}
        </p>
      )}

      <section className={g.card} aria-labelledby="roadmap-title">
        <div className={g.head}>
          <h2 id="roadmap-title" className={g.h2}>
            Roadmap
          </h2>
          <span className={g.muted}>Tick a milestone when you've done it</span>
        </div>
        <div className={g.spine} aria-hidden="true">
          {plan.phases.map(p => (
            <span
              key={p.id}
              className={`${g.spineSeg} ${p.endWeek < week ? g.spineSegPast : ''} ${p.id === current.id ? g.spineSegNow : ''}`}
              style={{flex: `${p.endWeek - p.startWeek + 1} 1 0`}}
            />
          ))}
          <span className={g.here} style={{left: `clamp(44px, ${hereLeft}%, calc(100% - 44px))`}}>
            You are here
            <span className={g.hereDot} />
          </span>
        </div>
        <div className={g.track} style={{gridTemplateColumns: plan.phases.map(p => `minmax(200px, ${p.endWeek - p.startWeek + 1}fr)`).join(' ')}}>
          {plan.phases.map(p => {
            const ms = plan.milestones.filter(m => m.phaseId === p.id);
            return (
              <div key={p.id} className={`${g.phase} ${p.id === current.id ? g.phaseNow : ''}`} aria-label={`${p.name} phase`}>
                <div>
                  <div className={g.phaseName}>{p.name}</div>
                  <div className={g.muted}>{p.startWeek === p.endWeek ? `Week ${p.startWeek}` : `Weeks ${p.startWeek}–${p.endWeek}`}</div>
                </div>
                <div className={g.phaseFocus}>{p.focus}</div>
                {ms.length > 0 && (
                  <ol className={g.nodes}>
                    {ms.map(m => {
                      const part = plan.components.find(c => c.id === m.componentId);
                      const due = !m.done && m.week <= week;
                      return (
                        <li key={m.id} className={g.node}>
                          <button
                            type="button"
                            className={`${g.check} ${m.done ? g.checkDone : ''} ${due ? g.checkDue : ''}`}
                            aria-pressed={m.done}
                            aria-label={`${m.done ? 'Mark not done' : 'Mark done'}: ${m.title}`}
                            disabled={busy === `m-${m.id}`}
                            onClick={() => toggle(m.id, !m.done)}>
                            {m.done && <CheckIcon />}
                          </button>
                          <span className={g.nodeBody}>
                            <span className={`${g.nodeTitle} ${m.done ? g.nodeTitleDone : ''}`}>{m.title}</span>
                            <span className={g.nodeMeta}>
                              Week {m.week}
                              {part ? ` · ${part.name}` : ''}
                              {due ? ' · due' : ''}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className={g.cols}>
        <div className={g.main}>
          {plan.components.length > 0 && (
            <section className={g.card} aria-labelledby="parts-title">
              <div className={g.head}>
                <h2 id="parts-title" className={g.h2}>
                  What race day asks of you
                </h2>
              </div>
              <div className={g.parts}>
                {plan.components.map(c => {
                  const st = STATUS_PILL[componentStatus(plan, c.id, week)];
                  return (
                    <div key={c.id} className={g.part}>
                      <span className={g.partName}>{c.name}</span>
                      <span className={g.muted}>{c.detail}</span>
                      <span>
                        <span className={st.cls}>{st.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className={g.card} aria-labelledby="checkin-title">
            <div className={g.head}>
              <h2 id="checkin-title" className={g.h2}>
                Weekly check-in
              </h2>
              {goal.checkin && <span className={CHECKIN_PILL[goal.checkin.status].cls}>{CHECKIN_PILL[goal.checkin.status].label}</span>}
            </div>
            {goal.checkin ? (
              <>
                <p style={{margin: 0, fontSize: 15}}>{goal.checkin.headline}</p>
                <ul className={g.adjustments}>
                  {goal.checkin.adjustments.map(a => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={g.muted} style={{marginBottom: 12}}>
                Your Muse compares the roadmap with your last two weeks and adjusts the next seven days.
              </p>
            )}
            <div className={g.row} style={{justifyContent: 'space-between'}}>
              <span className={g.disclaimer}>{goal.checkin ? `Last check-in ${new Date(goal.checkin.at).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}` : 'Uses only data you let your Muse see.'}</span>
              <button type="button" className={g.btnSoft} onClick={checkIn} disabled={busy === 'checkin'}>
                {busy === 'checkin' ? 'Checking in…' : goal.checkin ? 'Check in again' : 'Check in with Muse'}
              </button>
            </div>
          </section>
        </div>

        <aside className={g.side}>
          <section className={g.card} aria-labelledby="game-title">
            <h2 id="game-title" className={g.h2} style={{marginBottom: 4}}>
              This week's game
            </h2>
            <p className={g.muted} style={{marginBottom: 12}}>
              {next ? `Muse turns week ${week} into a boss fight built around "${next.title}".` : 'Keep your streak alive with a weekly boss fight.'}
            </p>
            {goal.questId ? (
              <div className={g.row}>
                <Link href={`/activities/games/${goal.questId}`} className={g.btnPrimary}>
                  Open your game
                </Link>
                <button type="button" className={g.btn} onClick={() => play()} disabled={busy === 'solo'}>
                  {busy === 'solo' ? 'Building…' : 'New week'}
                </button>
              </div>
            ) : (
              <button type="button" className={g.btnPrimary} style={{width: '100%'}} onClick={() => play()} disabled={busy === 'solo'}>
                {busy === 'solo' ? 'Building your game…' : 'Start my solo game'}
              </button>
            )}
            {matches.chats.length > 0 && (
              <>
                <p className={g.sectionLabel} style={{marginTop: 14}}>
                  Train together
                </p>
                <div className={g.list} style={{marginTop: 8}}>
                  {matches.chats.map(c => (
                    <div key={c.id} className={g.person}>
                      <div className={g.grow}>
                        <div className={g.personName}>{c.name}</div>
                        <div className={g.muted}>{c.sharing > 0 ? `${c.sharing} of ${c.members} share a matching goal` : `${c.members} people`}</div>
                      </div>
                      <button type="button" className={g.btnSoft} onClick={() => play(c.id)} disabled={busy === `chat-${c.id}`}>
                        {busy === `chat-${c.id}` ? 'Starting…' : 'Play here'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className={g.card} aria-labelledby="path-title">
            <h2 id="path-title" className={g.h2} style={{marginBottom: 12}}>
              On the same path
            </h2>
            {matches.friends.length + matches.groups.length + matches.events.length === 0 ? (
              <p className={g.muted}>Nobody in your friends, groups or events is training for this yet. Start a game in a chat to bring them along.</p>
            ) : (
              <div className={g.list}>
                {matches.friends.map(f => (
                  <Link key={`f-${f.id}`} href={`/profile/${f.id}`} className={g.person}>
                    <Avatar src={f.avatarUrl} alt="" size={40} />
                    <div className={g.grow}>
                      <div className={g.personName}>{f.name}</div>
                      <div className={g.muted}>Tagged {f.tag}</div>
                    </div>
                  </Link>
                ))}
                {matches.groups.map(gr => (
                  <Link key={`g-${gr.id}`} href={`/groups/${gr.id}`} className={g.person}>
                    <SmartImage src={gr.coverUrl} alt="" width={40} height={40} className={g.thumb} />
                    <div className={g.grow}>
                      <div className={g.personName}>{gr.name}</div>
                      <div className={g.muted}>Group · {gr.members.toLocaleString()} members</div>
                    </div>
                  </Link>
                ))}
                {matches.events.map(ev => (
                  <Link key={`e-${ev.id}`} href={`/events?id=${ev.id}`} className={g.person}>
                    <SmartImage src={ev.coverUrl} alt="" width={40} height={40} className={g.thumb} />
                    <div className={g.grow}>
                      <div className={g.personName}>{ev.title}</div>
                      <div className={g.muted}>
                        {new Date(ev.startsAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} · {ev.location}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <p className={g.disclaimer}>Only you can see this roadmap. Friends see a goal tag, which you can remove in Activities setup. Planning help, not medical advice.</p>
        </aside>
      </div>
    </div>
  );
}
