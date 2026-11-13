'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {componentStatus, type ComponentStatus} from '@/lib/activities/goal-plan';
import type {Goal, GoalMatches} from '@/lib/activities/goals';
import h from '../home/home.module.css';
import p from '../panels/panels.module.css';

const json = (method: string, body: unknown) => ({method, headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

const STATUS: Record<ComponentStatus, [string, string]> = {ready: ['Ready', p.green], training: ['Training', p.blue], later: ['Later', '']};
const CHECKIN = {ahead: ['Ahead', p.green], on_track: ['On track', p.blue], behind: ['Behind', p.red]} as const;

function formatDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
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
  const play = (conversationId?: number) => run(conversationId ? `chat-${conversationId}` : 'solo', () => fetch(`/api/goals/${goal.id}/game`, json('POST', conversationId ? {conversationId} : {})), d => router.push(String(d.url)));

  const pill = `${h.pill} ${h.pillSm}`;
  const people = [
    ...matches.friends.map(f => ({key: `f-${f.id}`, href: `/profile/${f.id}`, name: f.name, sub: `Tagged ${f.tag}`})),
    ...matches.groups.map(g => ({key: `g-${g.id}`, href: `/groups/${g.id}`, name: g.name, sub: `Group · ${g.members.toLocaleString()} members`})),
    ...matches.events.map(ev => ({key: `e-${ev.id}`, href: `/events?id=${ev.id}`, name: ev.title, sub: `${new Date(ev.startsAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} · ${ev.location}`})),
  ];

  return (
    <div className={p.stack}>
      <div className={p.rowText}>
        <h3 className={p.title}>{goal.title}</h3>
        <strong>{goal.status === 'done' ? <span className={`${p.badge} ${p.green}`}>Reached</span> : <span className={`${p.badge} ${p.blue}`}>{current.name}</span>}</strong>
      </div>
      <p className={p.stats}>
        <span>
          Week <b>{week}/{plan.weeks}</b>
        </span>
        <span>
          <b>{progress.done}/{progress.total}</b> milestones
        </span>
        {goal.eventDate && (
          <span>
            <b>{formatDate(goal.eventDate)}</b>
          </span>
        )}
      </p>
      <div className={`${p.bar} ${goal.status === 'done' ? p.done : ''}`} role="progressbar" aria-label="Milestones done" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct}>
        <span style={{width: `${progress.pct}%`}} />
      </div>
      {!goal.museUsed && <p className={p.note}>Muse was offline: standard plan.</p>}
      {error && <p className={p.error} role="alert">{error}</p>}

      {plan.phases.map(ph => (
        <div key={ph.id} className={p.stack}>
          <p className={p.label}>
            {ph.name} · {ph.startWeek === ph.endWeek ? `Week ${ph.startWeek}` : `Weeks ${ph.startWeek}–${ph.endWeek}`} {ph.id === current.id && goal.status !== 'done' && <span className={`${p.badge} ${p.blue}`}>Now</span>}
          </p>
          <ul className={p.lines}>
            {plan.milestones
              .filter(m => m.phaseId === ph.id)
              .map(m => (
                <li key={m.id}>
                  <label className={p.check}>
                    <input type="checkbox" checked={m.done} disabled={busy === `m-${m.id}`} onChange={e => void toggle(m.id, e.target.checked)} />
                    {m.title}
                  </label>
                  {!m.done && m.week <= week ? <span className={`${p.badge} ${p.ember}`}>Due</span> : <span className={p.metric}>Wk {m.week}</span>}
                </li>
              ))}
          </ul>
        </div>
      ))}

      {plan.components.length > 0 && (
        <>
          <p className={p.label}>Race day</p>
          <ul className={p.list}>
            {plan.components.map(c => {
              const st = STATUS[componentStatus(plan, c.id, week)];
              return (
                <li key={c.id} className={`${p.row} ${p.wrap}`}>
                  <span className={p.rowText}>
                    <strong>{c.name}</strong>
                    <small>{c.detail}</small>
                  </span>
                  <span className={`${p.badge} ${st[1]}`}>{st[0]}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className={p.label}>Check-in {goal.checkin && <span className={`${p.badge} ${CHECKIN[goal.checkin.status][1]}`}>{CHECKIN[goal.checkin.status][0]}</span>}</p>
      {goal.checkin && (
        <ul className={p.lines}>
          <li>{goal.checkin.headline}</li>
          {goal.checkin.adjustments.map(a => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <div className={p.actions}>
        <button type="button" className={`${pill} ${goal.checkin ? h.pillOutline : h.pillBlue}`} disabled={busy != null} onClick={() => void checkIn()}>
          {busy === 'checkin' ? '…' : goal.checkin ? 'Check in again' : 'Check in'}
        </button>
        {goal.checkin && <span className={p.note}>{new Date(goal.checkin.at).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}</span>}
      </div>

      <p className={p.label}>This week&apos;s game</p>
      {next && <p className={p.note}>Boss fight: {next.title}</p>}
      <div className={p.actions}>
        {goal.questId && (
          <a className={`${pill} ${h.pillBlue}`} href={`/activities/games/${goal.questId}`}>
            Open game
          </a>
        )}
        <button type="button" className={`${pill} ${goal.questId ? h.pillOutline : h.pillBlue}`} disabled={busy != null} onClick={() => void play()}>
          {busy === 'solo' ? '…' : goal.questId ? 'New week' : 'Start solo game'}
        </button>
      </div>
      {matches.chats.length > 0 && (
        <ul className={p.list}>
          {matches.chats.map(c => (
            <li key={c.id} className={p.row}>
              <span className={p.rowText}>
                <strong>{c.name}</strong>
                <small>{c.sharing > 0 ? `${c.sharing} of ${c.members} share this goal` : `${c.members} people`}</small>
              </span>
              <button type="button" className={`${pill} ${h.pillBlue}`} disabled={busy != null} onClick={() => void play(c.id)}>
                {busy === `chat-${c.id}` ? '…' : 'Play'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={p.label}>Same path</p>
      {people.length === 0 ? (
        <p className={p.note}>Nobody yet.</p>
      ) : (
        <ul className={p.list}>
          {people.map(x => (
            <li key={x.key} className={p.row}>
              <a className={p.rowMain} href={x.href}>
                <span className={p.rowText}>
                  <strong>{x.name}</strong>
                  <small>{x.sub}</small>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className={p.note}>Only you see this. Not medical advice.</p>
    </div>
  );
}
