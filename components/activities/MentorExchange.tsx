'use client';

import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import type {ConnectAction, ExchangeEvent, MentorRequestView, Plan, RelayMessage, Turn} from '@/lib/activities/mentor';
import styles from './mentor.module.css';

const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
const POLL_MS = 4000;

/** /activities/ahead/[id]: the advice exchange (streams once), then connect → a thread relayed by both Muses. */
export function MentorExchange({initial}: {initial: MentorRequestView}) {
  const [req, setReq] = useState(initial);
  const [turns, setTurns] = useState<Turn[]>(initial.transcript);
  const [plan, setPlan] = useState<Plan | null>(initial.plan);
  const [offline, setOffline] = useState<boolean | null>(initial.museOffline);
  const [typing, setTyping] = useState<'seeker' | 'mentor' | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [thread, setThread] = useState<RelayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  const isSeeker = req.role === 'seeker';
  const them = isSeeker ? req.mentor : req.seeker;
  const themLabel = them?.name ?? (isSeeker ? 'Someone a few months ahead' : 'Someone a few months behind you');
  const theirMuse = them ? `${them.name.split(' ')[0]}’s Muse` : 'Their Muse';
  const connected = req.connect === 'connected' && req.status !== 'revoked';

  useEffect(() => {
    endRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [turns, typing, plan]);

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

  useEffect(() => {
    threadEnd.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [thread.length]);

  const act = async (action: ConnectAction) => {
    setBusy(action);
    const res = await fetch(`/api/mentor/requests/${req.id}/connect`, json('POST', {action}));
    const d = (await res.json().catch(() => ({}))) as {request?: MentorRequestView};
    setBusy(null);
    if (res.ok && d.request) setReq(r => ({...r, ...d.request!, transcript: r.transcript, plan: r.plan ?? d.request!.plan}));
  };
  const send = async () => {
    if (!draft.trim()) return;
    setBusy('send');
    setSendError(null);
    const res = await fetch(`/api/mentor/requests/${req.id}/relay`, json('POST', {text: draft}));
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

  return (
    <div className={styles.page}>
      <div>
        <Link href="/activities/ahead" className={styles.sub}>
          ← A few months ahead
        </Link>
        <h1 className={styles.h1}>{req.offer.metric ? `${req.offer.metric}: ${req.offer.fromValue} → ${req.offer.toValue}` : isSeeker ? 'Where you want to be in 3 months' : 'Someone a few months behind you'}</h1>
        <div className={styles.sub}>
          Everything here goes through your Muses. Neither of you sees the other&apos;s raw data or words.
          {offline === true && <span className={styles.offline}> · Muse offline: scripted answers</span>}
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.identity}>
          {them ? (
            <Avatar src={them.avatarUrl} alt="" size={40} />
          ) : (
            <span className={styles.matchIcon} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z" />
              </svg>
            </span>
          )}
          <div>
            <div className={styles.matchTitle}>{them ? <Link href={`/profile/${them.id}`}>{them.name}</Link> : themLabel}</div>
            <div className={styles.matchSub}>
              {them ? 'You both chose to share your names.' : connected ? (req.reveal.them ? 'They shared their name. Share yours to see who they are.' : 'Names stay hidden unless you both share.') : 'Name hidden.'}
            </div>
          </div>
        </div>

        {req.status !== 'revoked' && (
          <div className={styles.actions}>
            {isSeeker && req.connect === 'none' && (
              <button type="button" className={styles.primary} disabled={!!busy} onClick={() => act('request')}>
                {busy === 'request' ? 'Sending…' : 'Connect: keep talking through your Muses'}
              </button>
            )}
            {isSeeker && req.connect === 'requested' && <span className={styles.sub}>Connect request sent. You&apos;ll get a notification when they answer.</span>}
            {req.connect === 'declined' && <span className={styles.sub}>{isSeeker ? 'They chose not to connect. The advice below is still yours.' : 'You chose not to connect.'}</span>}
            {!isSeeker && req.connect === 'requested' && (
              <>
                <span className={styles.sub} style={{flexBasis: '100%'}}>
                  They&apos;d like to keep talking. Messages go through your Muses both ways, and your name stays hidden unless you share it.
                </span>
                <button type="button" className={styles.primary} disabled={!!busy} onClick={() => act('accept')}>
                  {busy === 'accept' ? 'Connecting…' : 'Accept'}
                </button>
                <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => act('decline')}>
                  Decline
                </button>
              </>
            )}
            {connected && (
              <button type="button" className={styles.secondary} disabled={!!busy} onClick={() => act(req.reveal.me ? 'hide' : 'reveal')}>
                {req.reveal.me ? 'Hide my name' : 'Share my name'}
              </button>
            )}
          </div>
        )}
        {req.status === 'revoked' && <div className={styles.sub} style={{marginTop: 12}}>Stopped. You both keep what&apos;s below; no new messages can be sent.</div>}
      </section>

      {(turns.length > 0 || typing || streaming) && (
        <section className={styles.card} aria-label="Advice from their Muse" aria-live="polite">
          <h2 className={styles.h2}>{isSeeker ? 'Your Muse asked theirs' : 'Their Muse asked yours'}</h2>
          <div className={styles.sub}>
            {isSeeker ? 'Your' : 'Their'} Muse asks three questions; {isSeeker ? 'theirs' : 'yours'} answers from consented, rounded activity and {isSeeker ? 'their' : 'your'} note only.
          </div>
          <div className={styles.chat}>
            {turns.map((t, i) => (
              <div key={i}>
                <div className={styles.who} style={t.role === 'mentor' ? {textAlign: 'right'} : undefined}>
                  {(t.role === 'seeker') === isSeeker ? 'Your Muse' : theirMuse}
                </div>
                <div className={t.role === 'mentor' ? styles.turnMentor : styles.turn}>
                  <span className={t.role === 'mentor' ? styles.museMentor : styles.muse}>M</span>
                  <span className={t.role === 'mentor' ? styles.bubbleMentor : styles.bubble}>{t.text}</span>
                </div>
              </div>
            ))}
            {typing && (
              <div className={typing === 'mentor' ? styles.turnMentor : styles.turn}>
                <span className={typing === 'mentor' ? styles.museMentor : styles.muse}>M</span>
                <span className={typing === 'mentor' ? styles.bubbleMentor : styles.bubble}>
                  <span className={styles.typing} aria-label="typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </section>
      )}

      {plan && (
        <section className={styles.card} aria-label="Plan">
          <div className={styles.plan}>
            <h2 className={styles.h2}>{plan.title}</h2>
            <div className={styles.sub}>
              {plan.weeks} weeks · written by {offline ? 'a template (Muse offline)' : 'Muse Spark'} from the answers above
            </div>
            <ol>
              {plan.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <div className={styles.note}>{plan.note}</div>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                void navigator.clipboard?.writeText(`${plan.title}\n${plan.steps.join('\n')}`);
                setToast('Plan copied');
                window.setTimeout(() => setToast(null), 2000);
              }}>
              Copy plan
            </button>
          </div>
        </section>
      )}

      {(connected || thread.length > 0) && (
        <section className={styles.card} aria-label="Through your Muses" aria-live="polite">
          <h2 className={styles.h2}>Through your Muses</h2>
          <div className={styles.sub}>Write to your Muse. It removes names, contact details and health numbers, rewrites the message and passes it on. Only you see what you typed.</div>
          <div className={styles.chat}>
            {thread.length === 0 && <div className={styles.sub}>{isSeeker ? 'Ask anything about how they got there.' : 'Nothing yet. You will get a notification when they write.'}</div>}
            {thread.map(m => {
              const mineSide = m.fromRole === req.role;
              const label = m.kind === 'data_answer' ? (mineSide ? 'Your Muse, from your activity' : `${theirMuse}, from their activity`) : mineSide ? 'Your Muse passed on' : theirMuse;
              return (
                <div key={m.id}>
                  <div className={styles.who} style={mineSide ? undefined : {textAlign: 'right'}}>
                    {label}
                    {!m.museUsed && ' (as written, Muse offline)'}
                  </div>
                  <div className={mineSide ? styles.turn : styles.turnMentor}>
                    <span className={mineSide ? styles.muse : styles.museMentor}>M</span>
                    <span className={mineSide ? styles.bubble : styles.bubbleMentor}>
                      {m.text}
                      {m.rawText && m.rawText !== m.text && <span className={styles.raw}>You wrote: {m.rawText}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={threadEnd} />
          </div>
          {connected && (
            <div className={styles.composer}>
              <textarea className={styles.textarea} rows={2} maxLength={600} value={draft} onChange={e => setDraft(e.target.value)} placeholder={isSeeker ? 'Ask how they handled a bad week…' : 'Reply through your Muse…'} aria-label="Message to your Muse" />
              <button type="button" className={styles.primary} disabled={busy === 'send' || !draft.trim()} onClick={send}>
                {busy === 'send' ? 'Passing on…' : 'Send via Muse'}
              </button>
            </div>
          )}
          {sendError && (
            <div className={styles.sub} role="alert" style={{color: 'var(--fb-red)'}}>
              {sendError}
            </div>
          )}
        </section>
      )}

      {req.status !== 'revoked' && (
        <div className={styles.actions}>
          <button type="button" className={styles.danger} disabled={busy === 'revoke'} onClick={revoke}>
            Stop: no more messages (keeps what&apos;s here)
          </button>
        </div>
      )}
      {toast && <div className={styles.sub}>{toast}</div>}
    </div>
  );
}
