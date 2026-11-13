'use client';

import {useCallback, useEffect, useState} from 'react';
import type {ConnectAction, ExchangeEvent, MentorRequestView, Plan, RelayMessage, Turn} from '@/lib/activities/mentor';
import {IconUser} from '@tabler/icons-react';
import {useToast} from '@astryxdesign/core/Toast';
import h from './home/home.module.css';
import p from './panels/panels.module.css';

const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
const POLL_MS = 4000;

/** One mentor conversation in the Mentors panel: the advice exchange (streams once), then connect → a thread relayed by both Muses. */
export function MentorExchange({initial}: {initial: MentorRequestView}) {
  const [req, setReq] = useState(initial);
  const [turns, setTurns] = useState<Turn[]>(initial.transcript);
  const [plan, setPlan] = useState<Plan | null>(initial.plan);
  const [offline, setOffline] = useState<boolean | null>(initial.museOffline);
  const [typing, setTyping] = useState<'seeker' | 'mentor' | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const showToast = useToast();
  const [thread, setThread] = useState<RelayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const isSeeker = req.role === 'seeker';
  const them = isSeeker ? req.mentor : req.seeker;
  const themLabel = them?.name ?? (isSeeker ? 'Someone a few months ahead' : 'Someone a few months behind you');
  const theirMuse = them ? `${them.name.split(' ')[0]}’s Muse` : 'Their Muse';
  const connected = req.connect === 'connected' && req.status !== 'revoked';

  useEffect(() => {
    if (req.status !== 'accepted' || plan) return;
    setStreaming(true);
    const es = new EventSource(`/api/mentor/requests/${req.id}/stream`);
    es.onmessage = ev => {
      const e = JSON.parse(ev.data) as ExchangeEvent;
      if (e.type === 'typing') setTyping(e.who);
      else if (e.type === 'turn') {
        setTyping(null);
        setTurns(t => [...t, e.turn]);
      } else if (e.type === 'plan') {
        setTyping(null);
        setPlan(e.plan);
        setOffline(e.museOffline);
        setReq(r => ({...r, status: 'completed'}));
      } else if (e.type === 'done' || e.type === 'error') {
        setTyping(null);
        setStreaming(false);
        es.close();
      }
    };
    es.onerror = () => {
      setTyping(null);
      setStreaming(false);
      es.close();
    };
    return () => es.close();
  }, [req.id, req.status, plan]);

  // Thread + connect state poll (the other side may accept, reveal or reply at any time)
  const lastId = thread[thread.length - 1]?.id ?? 0;
  const poll = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        connected ? fetch(`/api/mentor/requests/${req.id}/relay?after=${lastId}`, {cache: 'no-store'}).then(x => (x.ok ? x.json() : {messages: []})) : Promise.resolve({messages: []}),
        fetch(`/api/mentor/requests/${req.id}`, {cache: 'no-store'}).then(x => (x.ok ? x.json() : null)),
      ]);
      const fresh = (t as {messages: RelayMessage[]}).messages;
      if (fresh.length) setThread(prev => [...prev, ...fresh.filter(m => !prev.some(p => p.id === m.id))]);
      const next = (r as {request?: MentorRequestView} | null)?.request;
      if (next) setReq(prev => ({...prev, connect: next.connect, reveal: next.reveal, seeker: next.seeker, mentor: next.mentor, status: prev.status === 'completed' && next.status === 'accepted' ? prev.status : next.status}));
    } catch {
      /* keep last good state */
    }
  }, [connected, lastId, req.id]);

  useEffect(() => {
    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  const act = async (action: ConnectAction) => {
    setBusy(action);
    const res = await fetch(`/api/mentor/requests/${req.id}/connect`, json('POST', {action}));
    const d = (await res.json().catch(() => ({}))) as {request?: MentorRequestView};
    setBusy(null);
    if (res.ok && d.request) setReq(r => ({...r, ...d.request!, transcript: r.transcript, plan: r.plan ?? d.request!.plan}));
  };
  const send = async (text = draft) => {
    if (!text.trim()) return;
    setBusy('send');
    setSendError(null);
    const res = await fetch(`/api/mentor/requests/${req.id}/relay`, json('POST', {text}));
    const d = (await res.json().catch(() => ({}))) as {messages?: RelayMessage[]; error?: string};
    setBusy(null);
    if (!res.ok) return setSendError(d.error ?? 'Your Muse could not pass that on.');
    setDraft('');
    setThread(prev => [...prev, ...(d.messages ?? []).filter(m => !prev.some(p => p.id === m.id))]);
  };
  const revoke = async () => {
    setBusy('revoke');
    const res = await fetch(`/api/mentor/requests/${req.id}`, json('DELETE'));
    setBusy(null);
    if (res.ok) setReq(r => ({...r, status: 'revoked'}));
  };

  const pill = `${h.pill} ${h.pillSm}`;
  const bubble = (key: string | number, mine: boolean, name: string, text: React.ReactNode, meta?: string) => (
    <div key={key} className={`${p.bubble} ${mine ? p.mine : ''}`}>
      <small>{name}</small>
      {text}
      {meta && <small>{meta}</small>}
    </div>
  );

  return (
    <div className={p.stack}>
      <div className={p.head}>
        <IconUser size={32} aria-hidden />
        <div className={p.rowText}>
          <h3 className={p.title}>{them ? <a href={`/profile/${them.id}`}>{them.name}</a> : themLabel}</h3>
          <strong>
            {req.offer.metric && <span className={p.metric}>{req.offer.metric}: {req.offer.fromValue} → {req.offer.toValue}</span>}
            {req.status === 'revoked' ? <span className={p.badge}>Stopped</span> : connected ? <span className={`${p.badge} ${p.green}`}>Connected</span> : req.connect === 'requested' ? <span className={`${p.badge} ${p.ember}`}>{isSeeker ? 'Sent' : 'Wants to connect'}</span> : req.connect === 'declined' ? <span className={p.badge}>Declined</span> : null}
            {!them && <span className={`${p.badge} ${p.purple}`}>Name hidden</span>}
            {offline === true && <span className={p.badge}>Muse offline</span>}
          </strong>
        </div>
      </div>
      {connected && !them && req.reveal.them && <p className={p.note}>They shared their name. Share yours to see it.</p>}
      {req.status !== 'revoked' && (
        <div className={p.actions}>
          {isSeeker && req.connect === 'none' && (
            <button type="button" className={`${pill} ${h.pillBlue}`} disabled={!!busy} onClick={() => void act('request')}>
              {busy === 'request' ? '…' : 'Connect'}
            </button>
          )}
          {!isSeeker && req.connect === 'requested' && (
            <>
              <button type="button" className={`${pill} ${h.pillBlue}`} disabled={!!busy} onClick={() => void act('accept')}>
                {busy === 'accept' ? '…' : 'Accept'}
              </button>
              <button type="button" className={`${pill} ${h.pillOutline}`} disabled={!!busy} onClick={() => void act('decline')}>
                Decline
              </button>
            </>
          )}
          {connected && (
            <button type="button" className={`${pill} ${h.pillOutline}`} disabled={!!busy} onClick={() => void act(req.reveal.me ? 'hide' : 'reveal')}>
              {req.reveal.me ? 'Hide my name' : 'Share my name'}
            </button>
          )}
        </div>
      )}

      {(turns.length > 0 || typing || streaming) && (
        <>
          <p className={p.label}>{isSeeker ? 'Your Muse asked theirs' : 'Their Muse asked yours'}</p>
          <div className={p.chat} aria-live="polite">
            {turns.map((t, i) => {
              const mine = (t.role === 'seeker') === isSeeker;
              return bubble(i, mine, mine ? 'Your Muse' : theirMuse, t.text);
            })}
            {typing && bubble('typing', (typing === 'seeker') === isSeeker, (typing === 'seeker') === isSeeker ? 'Your Muse' : theirMuse, '…')}
          </div>
        </>
      )}

      {plan && (
        <>
          <p className={p.label}>
            {plan.title} <span className={`${p.badge} ${p.blue}`}>{plan.weeks} wk</span>
          </p>
          <ol className={p.steps}>
            {plan.steps.map((st, i) => (
              <li key={i}>{st}</li>
            ))}
          </ol>
          {plan.note && <p className={p.note}>{plan.note}</p>}
          <button
            type="button"
            className={p.textBtn}
            onClick={() => {
              void navigator.clipboard?.writeText(`${plan.title}\n${plan.steps.join('\n')}`);
              showToast({body: 'Plan copied', autoHideDuration: 2000});
            }}>
            Copy plan
          </button>
        </>
      )}

      {(connected || thread.length > 0) && (
        <>
          <p className={p.label}>Messages</p>
          {thread.length === 0 ? (
            <p className={p.note}>{isSeeker ? 'Ask how they got there.' : 'Nothing yet.'}</p>
          ) : (
            <div className={p.chat} aria-live="polite">
              {thread.map(m => {
                const mineSide = m.fromRole === req.role;
                const label = m.kind === 'data_answer' ? (mineSide ? 'Your Muse, from your activity' : `${theirMuse}, from their activity`) : mineSide ? 'Your Muse passed on' : theirMuse;
                return bubble(m.id, mineSide, `${label}${m.museUsed ? '' : ' (as written)'}`, m.text, m.rawText && m.rawText !== m.text ? `You wrote: ${m.rawText}` : undefined);
              })}
            </div>
          )}
          {connected && (
            <form
              className={p.send}
              onSubmit={e => {
                e.preventDefault();
                void send();
              }}>
              <label className={p.field}>
                <span className={h.srOnly}>Message</span>
                <input value={draft} onChange={e => setDraft(e.target.value.slice(0, 600))} placeholder={isSeeker ? 'Ask how they handled a bad week…' : 'Reply through your Muse…'} disabled={busy === 'send'} />
              </label>
              <button type="submit" className={`${h.pill} ${h.pillBlue}`} disabled={busy === 'send' || !draft.trim()}>
                {busy === 'send' ? '…' : 'Send'}
              </button>
            </form>
          )}
          {sendError && <p className={p.error} role="alert">{sendError}</p>}
          <p className={p.note}>Your Muse rewrites each message and removes names and health numbers.</p>
        </>
      )}

      {req.status !== 'revoked' && (
        <button type="button" className={`${p.textBtn} ${p.danger}`} disabled={busy === 'revoke'} onClick={() => void revoke()}>
          Stop conversation
        </button>
      )}
    </div>
  );
}
