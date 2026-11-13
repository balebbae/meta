'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {MentorConsent, MentorRequestView} from '@/lib/activities/mentor';
import type {MentorMatch} from '@/lib/activities/discover';
import styles from './mentor.module.css';

type Offer = {metric: string; fromValue: string; toValue: string; weeks: number; consent: MentorConsent; anonymous: boolean};
const METRICS = ['5k time', 'Weekly distance', 'Workouts per week', 'Active days', 'Bench press'];
const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});

function PersonIcon() {
  return (
    <span className={styles.matchIcon} aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z" />
      </svg>
    </span>
  );
}

function statusLabel(r: MentorRequestView): string {
  if (r.status === 'revoked') return 'stopped';
  if (r.connect === 'connected') return 'connected';
  if (r.connect === 'requested') return r.role === 'mentor' ? 'wants to connect' : 'connect sent';
  return r.plan ? 'advice ready' : 'asking…';
}

/** /activities/ahead: people a few months ahead, conversations through your Muse, and opting in to help. */
export function MentorPage({offer: initialOffer, matches, requests, adult, highlight}: {offer: Offer | null; matches: MentorMatch[]; requests: MentorRequestView[]; adult: boolean; highlight: number | null}) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(initialOffer);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    metric: initialOffer?.metric ?? '',
    fromValue: initialOffer?.fromValue ?? '',
    toValue: initialOffer?.toValue ?? '',
    weeks: initialOffer?.weeks || 12,
    consent: {workouts: true, steps: false, heart: false, sleep: false, offerText: '', ...(initialOffer?.consent ?? {})} as MentorConsent,
    confirm18: !!initialOffer,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async () => {
    setBusy('save');
    setError(null);
    const res = await fetch('/api/mentor/offers', json('POST', {...form, anonymous: true}));
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
  };
  const start = async (mentorId: number, connect: boolean) => {
    setBusy(`${connect ? 'con' : 'ask'}-${mentorId}`);
    setError(null);
    const res = await fetch('/api/mentor/requests', json('POST', {mentorId, connect}));
    const d = (await res.json().catch(() => ({}))) as {id?: number; error?: string};
    setBusy(null);
    if (!res.ok) return setError(d.error ?? 'Could not reach their Muse');
    router.push(`/activities/ahead/${d.id}`);
  };

  const incoming = requests.filter(r => r.role === 'mentor');
  const outgoing = requests.filter(r => r.role === 'seeker');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({...f, [k]: v}));
  const setConsent = (k: keyof MentorConsent, v: boolean | string) => setForm(f => ({...f, consent: {...f.consent, [k]: v}}));
  const showForm = editing || !offer;

  return (
    <div className={styles.page}>
      <div>
        <Link href="/activities" className={styles.sub}>
          ← Activities
        </Link>
        <h1 className={styles.h1}>A few months ahead</h1>
        <div className={styles.sub}>
          People who are where you want to be in about 3 months. Ask their Muse what to do, or connect and keep talking. You only ever talk through your Muses, and names stay hidden unless you both choose to share. 18+ only.
        </div>
      </div>

      {!adult && <div className={styles.card}>This is 18+. Your profile birthday says you&apos;re under 18, so this page is read-only.</div>}

      {error && (
        <div className={styles.card} role="alert" style={{color: 'var(--fb-red)'}}>
          {error}
        </div>
      )}

      {incoming.length > 0 && (
        <section className={styles.card} aria-label="People your Muse is helping">
          <h2 className={styles.h2}>Your Muse is helping</h2>
          <div className={styles.list}>
            {incoming.map(r => (
              <Link key={r.id} href={`/activities/ahead/${r.id}`} className={styles.match}>
                <PersonIcon />
                <span className={styles.matchBody}>
                  <div className={styles.matchTitle}>{r.seeker?.name ?? 'Someone a few months behind you'}</div>
                  <div className={styles.matchSub}>{r.connect === 'requested' ? 'Wants to keep talking through your Muses' : r.connect === 'connected' ? 'Connected through your Muses' : 'Your Muse answered their questions'}</div>
                </span>
                <span className={r.connect === 'requested' ? styles.badgeAmber : styles.badgeBlue}>{statusLabel(r)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.card} aria-label="A few months ahead of you">
        <h2 className={styles.h2}>A few months ahead of you</h2>
        <div className={styles.sub}>Matched on rounded activity from the last 7 days (and progress records people chose to share), never raw data.</div>
        <div className={styles.list} style={{marginTop: 12}}>
          {matches.length === 0 && <div className={styles.sub}>Nobody matches yet. Log a few workouts or add goal tags and check back.</div>}
          {matches.map(m => {
            const existing = outgoing.find(r => r.id === m.requestId);
            return (
              <div key={m.mentorId} className={highlight === m.mentorId ? styles.matchHi : styles.match}>
                <PersonIcon />
                <span className={styles.matchBody}>
                  <div className={styles.matchTitle}>{m.title}</div>
                  <div className={styles.matchSub}>
                    {m.subtitle} · {m.why}
                  </div>
                </span>
                {m.requestId && m.status !== 'revoked' ? (
                  <Link href={`/activities/ahead/${m.requestId}`} className={styles.secondary}>
                    {existing ? statusLabel(existing) : 'Open'}
                  </Link>
                ) : (
                  <span style={{display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                    <button type="button" className={styles.primary} disabled={!adult || !!busy} onClick={() => start(m.mentorId, false)}>
                      {busy === `ask-${m.mentorId}` ? 'Asking…' : 'Ask their Muse'}
                    </button>
                    <button type="button" className={styles.secondary} disabled={!adult || !!busy} onClick={() => start(m.mentorId, true)}>
                      {busy === `con-${m.mentorId}` ? 'Sending…' : 'Connect'}
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {outgoing.length > 0 && (
        <section className={styles.card} aria-label="Your conversations">
          <h2 className={styles.h2}>Your conversations</h2>
          <div className={styles.list}>
            {outgoing.map(r => (
              <Link key={r.id} href={`/activities/ahead/${r.id}`} className={styles.match}>
                <PersonIcon />
                <span className={styles.matchBody}>
                  <div className={styles.matchTitle}>{r.mentor?.name ?? 'Someone a few months ahead'}</div>
                  <div className={styles.matchSub}>{r.plan ? r.plan.title : 'Their Muse is answering'}</div>
                </span>
                <span className={r.connect === 'requested' ? styles.badgeAmber : styles.badgeBlue}>{statusLabel(r)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.card} aria-label="Help people a few months behind you">
        <h2 className={styles.h2}>Help people a few months behind you</h2>
        <div className={styles.sub}>
          Opt in and your Muse answers beginners straight away from your rounded activity and your note. You get a summary of everything it said. Anyone who wants to keep talking asks first, and you choose whether to share your name.
        </div>
        {offer && !showForm ? (
          <>
            <div className={styles.match} style={{marginTop: 12}}>
              <span className={styles.matchBody}>
                <div className={styles.matchTitle}>{offer.metric ? `${offer.metric}: ${offer.fromValue} → ${offer.toValue} in ${offer.weeks} weeks` : 'Matched on your activity'}</div>
                <div className={styles.matchSub}>Your Muse may use: {(['workouts', 'steps', 'heart', 'sleep'] as const).filter(k => offer.consent[k]).join(', ') || 'only your note'}</div>
              </span>
              <span className={styles.badgeBlue}>On</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className={styles.danger} onClick={remove} disabled={busy === 'remove'}>
                Stop helping
              </button>
            </div>
          </>
        ) : (
          <div className={styles.form}>
            <label className={styles.full}>
              What worked for you (your Muse uses this in its answers)
              <textarea className={styles.textarea} value={form.consent.offerText ?? ''} onChange={e => setConsent('offerText', e.target.value)} placeholder="Two easy runs, one longer run a week, and never skipping two weeks in a row." />
            </label>
            <label>
              Progress record (optional)
              <select className={styles.select} value={form.metric} onChange={e => set('metric', e.target.value)}>
                <option value="">None, match on my activity</option>
                {METRICS.map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            {form.metric && (
              <>
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
              </>
            )}
            <div className={styles.full}>
              <div className={styles.sub} style={{fontWeight: 600, marginBottom: 4}}>
                Your Muse may use (rounded, never exact)
              </div>
              <div className={styles.toggles}>
                {(['workouts', 'steps', 'heart', 'sleep'] as const).map(k => (
                  <label key={k} className={styles.check}>
                    <input type="checkbox" checked={!!form.consent[k]} onChange={e => setConsent(k, e.target.checked)} />
                    {k === 'workouts' ? 'Workouts & distance (needed to match you)' : k === 'steps' ? 'Steps' : k === 'heart' ? 'Heart rate (Muse only)' : 'Sleep (Muse only)'}
                  </label>
                ))}
              </div>
            </div>
            <label className={`${styles.check} ${styles.full}`}>
              <input type="checkbox" checked={form.confirm18} onChange={e => set('confirm18', e.target.checked)} />
              I confirm I&apos;m 18 or older
            </label>
            <div className={`${styles.actions} ${styles.full}`}>
              <button type="button" className={styles.primary} disabled={!adult || !form.confirm18 || busy === 'save'} onClick={save}>
                {busy === 'save' ? 'Saving…' : offer ? 'Save changes' : 'Let people find me'}
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
    </div>
  );
}
