'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Avatar} from '@/components/ui/Avatar';
import type {MentorConsent, MentorRequestView} from '@/lib/activities/mentor';
import type {MentorMatch} from '@/lib/activities/discover';
import styles from './mentor.module.css';

type Offer = {metric: string; fromValue: string; toValue: string; weeks: number; consent: MentorConsent; anonymous: boolean};
const METRICS = ['5k time', 'Bench press', 'Workouts per week', 'Weekly distance', 'Active days'];
const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});

export function MentorPage({offer: initialOffer, matches, requests, adult, highlight}: {offer: Offer | null; matches: MentorMatch[]; requests: MentorRequestView[]; adult: boolean; highlight: number | null}) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(initialOffer);
  const [editing, setEditing] = useState(!initialOffer && highlight == null);
  const [form, setForm] = useState<Offer & {confirm18: boolean}>({metric: initialOffer?.metric ?? METRICS[0], fromValue: initialOffer?.fromValue ?? '', toValue: initialOffer?.toValue ?? '', weeks: initialOffer?.weeks ?? 12, anonymous: initialOffer?.anonymous ?? true, consent: {workouts: true, steps: false, heart: false, sleep: false, offerText: '', reviewBeforeSend: false, ...(initialOffer?.consent ?? {})}, confirm18: !!initialOffer});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async () => {
    setBusy('save');
    setError(null);
    const res = await fetch('/api/mentor/offers', json('POST', form));
    const d = (await res.json().catch(() => ({}))) as {offer?: Offer; error?: string};
    setBusy(null);
    if (!res.ok) return setError(d.error ?? 'Could not save');
    setOffer(d.offer ?? null);
    setEditing(false);
  };
  const remove = async () => {
    setBusy('remove');
    await fetch('/api/mentor/offers', json('DELETE'));
    setOffer(null);
    setBusy(null);
    setEditing(true);
  };
  const request = async (mentorId: number) => {
    setBusy(`req-${mentorId}`);
    setError(null);
    const res = await fetch('/api/mentor/requests', json('POST', {mentorId}));
    const d = (await res.json().catch(() => ({}))) as {id?: number; error?: string};
    setBusy(null);
    if (!res.ok) return setError(d.error ?? 'Could not send the request');
    router.push(`/activities/mentor/${d.id}`);
  };

  const incoming = requests.filter(r => r.role === 'mentor');
  const outgoing = requests.filter(r => r.role === 'seeker');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({...f, [k]: v}));
  const setConsent = (k: keyof MentorConsent, v: boolean | string) => setForm(f => ({...f, consent: {...f.consent, [k]: v}}));

  return (
    <div className={styles.page}>
      <div>
        <Link href="/activities" className={styles.sub}>
          ← Activities
        </Link>
        <h1 className={styles.h1}>Mentors</h1>
        <div className={styles.sub}>Ask someone who did what you want — without either of you sharing raw data. Your Muses talk; you read the plan. 18+ only.</div>
      </div>

      {!adult && <div className={styles.card}>Mentor match is 18+. Your profile birthday says you&apos;re under 18, so this page is read-only.</div>}

      {error && (
        <div className={styles.card} role="alert" style={{color: 'var(--fb-red)'}}>
          {error}
        </div>
      )}

      {incoming.length > 0 && (
        <section className={styles.card} aria-label="Requests for you">
          <h2 className={styles.h2}>Someone asked your Muse</h2>
          <div className={styles.list}>
            {incoming.map(r => (
              <Link key={r.id} href={`/activities/mentor/${r.id}`} className={styles.match}>
                <Avatar src={r.seeker.avatarUrl} alt="" size={44} />
                <span className={styles.matchBody}>
                  <div className={styles.matchTitle}>{r.seeker.name} wants to know how you did it</div>
                  <div className={styles.matchSub}>
                    {r.offer.metric}: {r.offer.fromValue} → {r.offer.toValue}
                  </div>
                </span>
                <span className={r.status === 'pending' ? styles.badgeAmber : styles.badgeBlue}>{r.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.card} aria-label="Mentors who did what you want">
        <h2 className={styles.h2}>Mentors who did what you want</h2>
        <div className={styles.sub}>Matched on their growth record and your goal tags. You see the record only; who they are stays hidden until they accept.</div>
        <div className={styles.list} style={{marginTop: 12}}>
          {matches.length === 0 && <div className={styles.sub}>No mentors match your tags yet.</div>}
          {matches.map(m => {
            const existing = outgoing.find(r => r.mentor?.id === m.mentorId || r.id === m.requestId);
            return (
              <div key={m.mentorId} className={highlight === m.mentorId ? styles.matchHi : styles.match}>
                <span className={styles.matchIcon} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z"/></svg>
                </span>
                <span className={styles.matchBody}>
                  <div className={styles.matchTitle}>
                    {m.metric}: {m.fromValue} → {m.toValue}
                  </div>
                  <div className={styles.matchSub}>
                    in {m.weeks} weeks · matches your “{m.goalTag}” tag · {m.anonymous ? 'anonymous' : 'friend of a friend'}
                  </div>
                </span>
                {existing || m.requestId ? (
                  <Link href={`/activities/mentor/${existing?.id ?? m.requestId}`} className={styles.secondary}>
                    {m.status ?? existing?.status ?? 'view'}
                  </Link>
                ) : (
                  <button type="button" className={styles.primary} disabled={!adult || busy === `req-${m.mentorId}`} onClick={() => request(m.mentorId)}>
                    {busy === `req-${m.mentorId}` ? 'Sending…' : 'Ask their Muse'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.card} aria-label="Offer mentorship">
        <h2 className={styles.h2}>Offer mentorship</h2>
        <div className={styles.sub}>Opt in with one growth record. Seekers see the record, never your name, until you accept. Your Muse answers only from the categories you tick.</div>
        {offer && !editing ? (
          <>
            <div className={styles.match} style={{marginTop: 12}}>
              <span className={styles.matchBody}>
                <div className={styles.matchTitle}>
                  {offer.metric}: {offer.fromValue} → {offer.toValue} in {offer.weeks} weeks
                </div>
                <div className={styles.matchSub}>
                  {offer.anonymous ? 'Anonymous' : 'Name shown after accept'} · shares: {(['workouts', 'steps', 'heart', 'sleep'] as const).filter(k => offer.consent[k]).join(', ') || 'nothing'}
                </div>
              </span>
              <span className={styles.badgeBlue}>In the pool</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className={styles.danger} onClick={remove} disabled={busy === 'remove'}>
                Leave the pool
              </button>
            </div>
          </>
        ) : (
          <div className={styles.form}>
            <label>
              Metric
              <select className={styles.select} value={form.metric} onChange={e => set('metric', e.target.value)}>
                {METRICS.map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              Weeks it took
              <input className={styles.input} type="number" min={1} max={104} value={form.weeks} onChange={e => set('weeks', Number(e.target.value))} />
            </label>
            <label>
              From
              <input className={styles.input} value={form.fromValue} onChange={e => set('fromValue', e.target.value)} placeholder="29:10" />
            </label>
            <label>
              To
              <input className={styles.input} value={form.toValue} onChange={e => set('toValue', e.target.value)} placeholder="24:40" />
            </label>
            <label className={styles.full}>
              What actually worked (your Muse quotes this)
              <textarea className={styles.textarea} value={form.consent.offerText ?? ''} onChange={e => setConsent('offerText', e.target.value)} placeholder="Two easy runs, one tempo, one long run a week…" />
            </label>
            <div className={styles.full}>
              <div className={styles.sub} style={{fontWeight: 600, marginBottom: 4}}>
                Your Muse may use (rounded, never exact)
              </div>
              <div className={styles.toggles}>
                {(['workouts', 'steps', 'heart', 'sleep'] as const).map(k => (
                  <label key={k} className={styles.check}>
                    <input type="checkbox" checked={!!form.consent[k]} onChange={e => setConsent(k, e.target.checked)} />
                    {k === 'workouts' ? 'Workouts & distance' : k === 'steps' ? 'Steps' : k === 'heart' ? 'Heart rate (Muse only)' : 'Sleep (Muse only)'}
                  </label>
                ))}
              </div>
            </div>
            <label className={`${styles.check} ${styles.full}`}>
              <input type="checkbox" checked={form.anonymous} onChange={e => set('anonymous', e.target.checked)} />
              Stay anonymous even after I accept
            </label>
            <label className={`${styles.check} ${styles.full}`}>
              <input type="checkbox" checked={!!form.consent.reviewBeforeSend} onChange={e => setConsent('reviewBeforeSend', e.target.checked)} />
              Let me review each request before my Muse answers
            </label>
            <label className={`${styles.check} ${styles.full}`}>
              <input type="checkbox" checked={form.confirm18} onChange={e => set('confirm18', e.target.checked)} />
              I confirm I&apos;m 18 or older
            </label>
            <div className={`${styles.actions} ${styles.full}`}>
              <button type="button" className={styles.primary} disabled={!adult || !form.confirm18 || busy === 'save'} onClick={save}>
                {busy === 'save' ? 'Saving…' : offer ? 'Save changes' : 'Join the mentor pool'}
              </button>
              {offer && (
                <button type="button" className={styles.secondary} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className={styles.card} aria-label="Your requests">
          <h2 className={styles.h2}>Your requests</h2>
          <div className={styles.list}>
            {outgoing.map(r => (
              <Link key={r.id} href={`/activities/mentor/${r.id}`} className={styles.match}>
                <span className={styles.matchBody}>
                  <div className={styles.matchTitle}>
                    {r.offer.metric}: {r.offer.fromValue} → {r.offer.toValue}
                  </div>
                  <div className={styles.matchSub}>{r.mentor ? r.mentor.name : 'Anonymous mentor'}</div>
                </span>
                <span className={r.status === 'pending' ? styles.badgeAmber : styles.badgeBlue}>{r.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
