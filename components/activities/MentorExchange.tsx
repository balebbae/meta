'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import type {ExchangeEvent, MentorConsent, MentorRequestView, Plan, Turn} from '@/lib/activities/mentor';
import styles from './mentor.module.css';

const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});

export function MentorExchange({initial}: {initial: MentorRequestView}) {
  const router = useRouter();
  const [req, setReq] = useState(initial);
  const [turns, setTurns] = useState<Turn[]>(initial.transcript);
  const [plan, setPlan] = useState<Plan | null>(initial.plan);
  const [offline, setOffline] = useState<boolean | null>(initial.museOffline);
  const [typing, setTyping] = useState<'seeker' | 'mentor' | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [consent, setConsent] = useState<MentorConsent>({workouts: true, steps: false, heart: false, sleep: false, ...initial.consent});
  const [anonymous, setAnonymous] = useState(initial.offer.anonymous);
  const [toast, setToast] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

  const decide = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    const res = await fetch(`/api/mentor/requests/${req.id}/consent`, json('POST', {accept, consent, anonymous}));
    const d = (await res.json().catch(() => ({}))) as {request?: MentorRequestView};
    setBusy(null);
    if (res.ok && d.request) setReq(d.request);
  };
  const revoke = async () => {
    setBusy('revoke');
    const res = await fetch(`/api/mentor/requests/${req.id}`, json('DELETE'));
    setBusy(null);
    if (res.ok) setReq(r => ({...r, status: 'revoked'}));
  };
  const startTurf = async () => {
    setBusy('turf');
    const res = await fetch('/api/games', json('POST', {gameType: 'turf', title: 'Mentor Turf', inviteUserIds: [req.role === 'seeker' ? req.mentor?.id : req.seeker.id].filter(Boolean)}));
    setBusy(null);
    if (res.status === 404 || res.status === 501) return router.push('/activities?start=turf');
    const d = (await res.json().catch(() => ({}))) as {id?: number; game?: {id?: number}; gameId?: number; url?: string};
    if (!res.ok) return router.push('/activities?start=turf');
    router.push(d.url ?? `/activities/turf/${d.game?.id ?? d.gameId ?? d.id ?? ''}`);
  };

  const other = req.role === 'seeker' ? (req.mentor ? req.mentor.name : 'Anonymous mentor') : req.seeker.name;
  const seekerMuse = req.role === 'seeker' ? 'Your Muse' : `${req.seeker.name.split(' ')[0]}’s Muse`;
  const mentorMuse = req.role === 'mentor' ? 'Your Muse' : req.mentor ? `${req.mentor.name.split(' ')[0]}’s Muse` : 'Mentor’s Muse';
  const pending = req.status === 'pending';

  return (
    <div className={styles.page}>
      <div>
        <Link href="/activities/mentor" className={styles.sub}>
          ← Mentors
        </Link>
        <h1 className={styles.h1}>
          {req.offer.metric}: {req.offer.fromValue} → {req.offer.toValue}
        </h1>
        <div className={styles.sub}>
          in {req.offer.weeks} weeks · {req.role === 'seeker' ? 'you asked' : `${req.seeker.name} asked`} · <span className={req.status === 'pending' ? styles.badgeAmber : styles.badgeBlue}>{req.status}</span>
          {offline === true && <span className={styles.offline}> · Muse offline: scripted exchange</span>}
        </div>
      </div>

      <section className={styles.card}>
        <div className={styles.identity}>
          {req.role === 'seeker' ? (
            req.mentor ? (
              <>
                <Avatar src={req.mentor.avatarUrl} alt="" size={40} />
                <div>
                  <div className={styles.matchTitle}>{req.mentor.name}</div>
                  <div className={styles.matchSub}>Revealed after accepting</div>
                </div>
              </>
            ) : (
              <>
                <span className={styles.matchIcon} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z"/></svg>
                </span>
                <div>
                  <div className={styles.matchTitle}>Anonymous mentor</div>
                  <div className={styles.matchSub}>{pending ? 'Nothing is shared until they accept.' : 'They chose to stay anonymous.'}</div>
                </div>
              </>
            )
          ) : (
            <>
              <Avatar src={req.seeker.avatarUrl} alt="" size={40} />
              <div>
                <div className={styles.matchTitle}>{req.seeker.name}</div>
                <div className={styles.matchSub}>wants to know how you did it</div>
              </div>
            </>
          )}
        </div>

        {pending && req.role === 'mentor' && (
          <>
            <div className={styles.sub} style={{marginTop: 12, fontWeight: 600}}>
              Your Muse may use (rounded, never exact):
            </div>
            <div className={styles.toggles}>
              {(['workouts', 'steps', 'heart', 'sleep'] as const).map(k => (
                <label key={k} className={styles.check}>
                  <input type="checkbox" checked={!!consent[k]} onChange={e => setConsent(c => ({...c, [k]: e.target.checked}))} />
                  {k === 'workouts' ? 'Workouts & distance' : k === 'steps' ? 'Steps' : k === 'heart' ? 'Heart rate (Muse only)' : 'Sleep (Muse only)'}
                </label>
              ))}
              <label className={styles.check}>
                <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
                Stay anonymous
              </label>
              <label className={styles.check}>
                <input type="checkbox" checked={!!consent.reviewBeforeSend} onChange={e => setConsent(c => ({...c, reviewBeforeSend: e.target.checked}))} />
                Review before my Muse sends
              </label>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} disabled={busy === 'accept'} onClick={() => decide(true)}>
                {busy === 'accept' ? 'Accepting…' : 'Accept — let our Muses talk'}
              </button>
              <button type="button" className={styles.secondary} disabled={busy === 'decline'} onClick={() => decide(false)}>
                Decline
              </button>
            </div>
          </>
        )}
        {pending && req.role === 'seeker' && <div className={styles.sub} style={{marginTop: 12}}>Waiting for the mentor to accept. You&apos;ll get a notification; the exchange starts here automatically.</div>}
        {req.status === 'declined' && <div className={styles.sub} style={{marginTop: 12}}>This request was declined. Nothing was shared.</div>}
        {req.status === 'revoked' && <div className={styles.sub} style={{marginTop: 12}}>Revoked. Both of you keep the transcript below; no new answers will be generated.</div>}
      </section>

      {(turns.length > 0 || typing || streaming) && (
        <section className={styles.card} aria-label="Muse exchange" aria-live="polite">
          <h2 className={styles.h2}>Muse ↔ Muse</h2>
          <div className={styles.sub}>
            {req.role === 'seeker' ? 'Your' : `${req.seeker.name.split(' ')[0]}’s`} Muse asks three questions; {req.role === 'mentor' ? 'your' : `the mentor’s`} Muse answers from consented, rounded facts and the offer note only.
          </div>
          <div className={styles.chat}>
            {turns.map((t, i) => (
              <div key={i}>
                <div className={styles.who} style={t.role === 'mentor' ? {textAlign: 'right'} : undefined}>
                  {t.role === 'seeker' ? seekerMuse : mentorMuse}
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
            <div className={styles.sub}>{plan.weeks} weeks · written by {offline ? 'a template (Muse offline)' : 'Muse Spark'} from the exchange above</div>
            <ol>
              {plan.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <div className={styles.note}>{plan.note}</div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy === 'turf'} onClick={startTurf}>
              {busy === 'turf' ? 'Starting…' : 'Start a Turf game together'}
            </button>
            <button type="button" className={styles.secondary} onClick={() => {
              void navigator.clipboard?.writeText(`${plan.title}\n${plan.steps.join('\n')}`);
              setToast('Plan copied');
              window.setTimeout(() => setToast(null), 2000);
            }}>
              Copy plan
            </button>
          </div>
        </section>
      )}

      {req.status !== 'revoked' && req.status !== 'declined' && (
        <div className={styles.actions}>
          <button type="button" className={styles.danger} disabled={busy === 'revoke'} onClick={revoke}>
            Revoke — stop sharing (keeps the transcript)
          </button>
        </div>
      )}
      {toast && <div className={styles.sub}>{toast}</div>}
    </div>
  );
}
