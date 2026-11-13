'use client';

import {useState} from 'react';
import {usePanelNav} from './panels/nav';
import type {MentorConsent, MentorRequestView} from '@/lib/activities/mentor';
import type {MentorMatch} from '@/lib/activities/discover';
import {IconUser} from '@tabler/icons-react';
import h from './home/home.module.css';
import p from './panels/panels.module.css';

const statusBadge = (r: MentorRequestView) => <span className={`${p.badge} ${r.status === 'revoked' ? '' : r.connect === 'requested' ? p.ember : r.connect === 'connected' ? p.green : p.blue}`}>{statusLabel(r)}</span>;

type Offer = {metric: string; fromValue: string; toValue: string; weeks: number; consent: MentorConsent; anonymous: boolean};
const METRICS = ['5k time', 'Weekly distance', 'Workouts per week', 'Active days', 'Bench press'];
const json = (method: string, body?: unknown) => ({method, headers: {'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});

function statusLabel(r: MentorRequestView): string {
  if (r.status === 'revoked') return 'Stopped';
  if (r.connect === 'connected') return 'Connected';
  if (r.connect === 'requested') return r.role === 'mentor' ? 'Wants to connect' : 'Sent';
  return r.plan ? 'Advice ready' : 'Asking…';
}

/** Mentors panel: people a few months ahead, conversations through your Muse, and opting in to help. */
export function MentorPage({offer: initialOffer, matches, requests, adult, highlight}: {offer: Offer | null; matches: MentorMatch[]; requests: MentorRequestView[]; adult: boolean; highlight: number | null}) {
  const {open} = usePanelNav();
  const thread = (id: number | undefined) => open({panel: 'mentors', request: id});
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
    thread(d.id);
  };

  const incoming = requests.filter(r => r.role === 'mentor');
  const outgoing = requests.filter(r => r.role === 'seeker');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({...f, [k]: v}));
  const setConsent = (k: keyof MentorConsent, v: boolean | string) => setForm(f => ({...f, consent: {...f.consent, [k]: v}}));
  const showForm = editing || !offer;

  const pill = `${h.pill} ${h.pillSm}`;
  const USE = [['workouts', 'Workouts'], ['steps', 'Steps'], ['heart', 'Heart rate'], ['sleep', 'Sleep']] as const;
  const threads = (label: string, rows: MentorRequestView[], name: (r: MentorRequestView) => string) =>
    rows.length > 0 && (
      <>
        <p className={p.label}>{label}</p>
        <ul className={p.list}>
          {rows.map(r => (
            <li key={r.id} className={p.row}>
              <button type="button" className={p.rowMain} onClick={() => thread(r.id)}>
                <IconUser size={22} aria-hidden />
                <span className={p.rowText}>
                  <strong>{name(r)}</strong>
                </span>
              </button>
              {statusBadge(r)}
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <div className={p.stack}>
      <p className={p.note}>People about 3 months ahead. You talk through your Muses. 18+.</p>
      {!adult && <p className={p.error}>18+ only: read-only for you.</p>}
      {error && <p className={p.error} role="alert">{error}</p>}

      {threads('Helping', incoming, r => r.seeker?.name ?? 'Someone behind you')}

      <p className={p.label}>Suggested</p>
      {matches.length === 0 ? (
        <p className={p.note}>Nobody yet. Log a few workouts.</p>
      ) : (
        <ul className={p.list}>
          {matches.map(m => {
            const existing = outgoing.find(r => r.id === m.requestId);
            const opened = m.requestId && m.status !== 'revoked';
            return (
              <li key={m.mentorId} className={`${p.row} ${p.wrap} ${highlight === m.mentorId ? p.selected : ''}`}>
                <IconUser size={22} aria-hidden />
                <span className={p.rowText}>
                  <strong>{m.title}</strong>
                  <small>{m.subtitle}</small>
                </span>
                <span className={p.rowEnd}>
                  {opened ? (
                    <button type="button" className={`${pill} ${h.pillOutline}`} onClick={() => thread(m.requestId ?? undefined)}>
                      {existing ? statusLabel(existing) : 'Open'}
                    </button>
                  ) : (
                    <>
                      <button type="button" className={`${pill} ${h.pillBlue}`} disabled={!adult || !!busy} onClick={() => void start(m.mentorId, false)}>
                        {busy === `ask-${m.mentorId}` ? '…' : 'Ask'}
                      </button>
                      <button type="button" className={`${pill} ${h.pillOutline}`} disabled={!adult || !!busy} onClick={() => void start(m.mentorId, true)}>
                        {busy === `con-${m.mentorId}` ? '…' : 'Connect'}
                      </button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {threads('Conversations', outgoing, r => (r.mentor?.name ?? (r.offer.metric ? `${r.offer.metric}: ${r.offer.fromValue} → ${r.offer.toValue}` : 'Someone ahead of you')))}

      <p className={p.label}>Help others {offer && !showForm && <span className={`${p.badge} ${p.green}`}>On</span>}</p>
      {!showForm && offer ? (
        <>
          <ul className={p.list}>
            <li className={`${p.row} ${p.wrap}`}>
              <span className={p.rowText}>
                <strong>{offer.metric ? `${offer.metric}: ${offer.fromValue} → ${offer.toValue} in ${offer.weeks} wk` : 'Matched on your activity'}</strong>
                <small>Uses {USE.filter(([k]) => offer.consent[k]).map(([, l]) => l.toLowerCase()).join(', ') || 'only your note'}</small>
              </span>
            </li>
          </ul>
          <div className={p.actions}>
            <button type="button" className={`${pill} ${h.pillOutline}`} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className={`${p.textBtn} ${p.danger}`} disabled={busy === 'remove'} onClick={() => void remove()}>
              Stop helping
            </button>
          </div>
        </>
      ) : (
        <>
          <label className={p.field}>
            What worked for you
            <textarea rows={2} value={form.consent.offerText ?? ''} onChange={e => setConsent('offerText', e.target.value)} placeholder="Two easy runs and one long run a week." />
          </label>
          <label className={p.field}>
            Progress record (optional)
            <select value={form.metric} onChange={e => set('metric', e.target.value)}>
              <option value="">None, match on my activity</option>
              {METRICS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {form.metric && (
            <div className={p.fields}>
              <label className={p.field}>
                Weeks
                <input type="number" min={1} max={104} step={1} value={form.weeks} onChange={e => set('weeks', Math.round(Number(e.target.value)) || 1)} />
              </label>
              <label className={p.field}>
                From
                <input value={form.fromValue} onChange={e => set('fromValue', e.target.value)} placeholder="29:10" />
              </label>
              <label className={p.field}>
                To
                <input value={form.toValue} onChange={e => set('toValue', e.target.value)} placeholder="24:40" />
              </label>
            </div>
          )}
          <p className={p.label}>Your Muse may use (rounded)</p>
          <div className={p.pills}>
            {USE.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={!!form.consent[k]} className={`${pill} ${form.consent[k] ? h.pillBlue : h.pillOutline}`} onClick={() => setConsent(k, !form.consent[k])}>
                {label}
              </button>
            ))}
          </div>
          <label className={p.check}>
            <input type="checkbox" checked={form.confirm18} onChange={e => set('confirm18', e.target.checked)} />
            I&apos;m 18 or older
          </label>
          <div className={p.actions}>
            <button type="button" className={`${pill} ${h.pillBlue}`} disabled={!adult || !form.confirm18 || busy === 'save'} onClick={() => void save()}>
              {busy === 'save' ? '…' : offer ? 'Save' : 'Let people find me'}
            </button>
            {offer && (
              <button type="button" className={`${pill} ${h.pillOutline}`} onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
