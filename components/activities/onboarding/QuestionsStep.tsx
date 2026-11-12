'use client';
import {useState} from 'react';
import {StepShell} from './StepShell';
import {SCHEDULE_OPTIONS, WEEKLY_OPTIONS, WITH_WHOM_OPTIONS, type StarterChatResult} from '@/lib/activities/starter-chat';
import type {ActivityProfile, StarterAnswers} from '@/lib/activities/onboarding';
import type {TagKind} from '@/lib/activities/types';
import styles from '../activities.module.css';

const WEEKLY_LABEL: Record<string, string> = {'0': 'Not yet', '1-2': '1–2 days', '3-4': '3–4 days', '5+': '5+ days'};
const GOALS = ['Get started', 'Be consistent', 'Train for an event', 'Get faster', 'Get stronger', 'Lose the phone and go outside', 'Sleep better', 'Do it with friends'];

export function QuestionsStep({profile, invite}: {profile: ActivityProfile; invite: number | null}) {
  const [mode, setMode] = useState<'tap' | 'chat'>('tap');
  const [a, setA] = useState<StarterAnswers>({weeklyActiveDays: profile.weeklyActiveDays, primaryGoal: profile.primaryGoal, schedule: profile.schedule ?? [], withWhom: profile.withWhom, goEasyNote: profile.goEasyNote, interestSuggestionsEnabled: profile.interestSuggestionsEnabled});
  const [chat, setChat] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatResult, setChatResult] = useState<StarterChatResult | null>(null);
  const [chatTags, setChatTags] = useState<{tag: string; kind: TagKind; on: boolean}[]>([]);

  async function askMuse() {
    if (!chat.trim()) return;
    setChatBusy(true);
    const res = await fetch('/api/activities/starter-chat', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text: chat})});
    setChatBusy(false);
    if (!res.ok) return;
    const r = (await res.json()) as StarterChatResult;
    setChatResult(r);
    setChatTags(r.tags.map(t => ({...t, on: true})));
    setA(prev => ({...prev, ...Object.fromEntries(Object.entries(r.answers).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length)))}));
  }

  async function save() {
    const body: {answers: StarterAnswers; tags?: {tag: string; kind: TagKind}[]} = {answers: a};
    const tags = chatTags.filter(t => t.on).map(({tag, kind}) => ({tag, kind}));
    if (tags.length) {
      // merge with already selected tags so the chat path adds rather than replaces
      const existing = (await fetch('/api/activities/tags').then(r => r.json()).catch(() => ({tags: []}))).tags as {tag: string; kind: TagKind}[];
      body.tags = [...existing.filter(t => t.kind !== 'constraint').map(({tag, kind}) => ({tag, kind})), ...tags.filter(t => !existing.some(e => e.kind === t.kind && e.tag === t.tag))];
    }
    const res = await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
    if (!res.ok) throw new Error('Could not save answers');
  }

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} className={on ? styles.chipOn : styles.chip} aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <StepShell step="questions" invite={invite} save={save}>
      <p className={styles.sub}>Your Muse uses these to size your first games. Answers are Muse-only unless you share them later.</p>
      <div className={styles.tabs} role="tablist">
        <button role="tab" aria-selected={mode === 'tap'} className={mode === 'tap' ? styles.tabOn : styles.tab} onClick={() => setMode('tap')}>
          Tap answers
        </button>
        <button role="tab" aria-selected={mode === 'chat'} className={mode === 'chat' ? styles.tabOn : styles.tab} onClick={() => setMode('chat')}>
          Just tell my Muse
        </button>
      </div>
      {mode === 'chat' && (
        <div className={styles.card}>
          <label className={styles.label} htmlFor="ob-chat">
            One message is enough
          </label>
          <textarea id="ob-chat" className={styles.textarea} value={chat} onChange={e => setChat(e.target.value)} placeholder="“I used to run but mostly walk now, maybe twice a week. Evenings after work. I'd love to get back into it with my roommates. Bad left knee so nothing with jumping.”" />
          <div className={styles.row} style={{marginTop: 8}}>
            <button className={styles.btnPrimary} onClick={() => void askMuse()} disabled={chatBusy || !chat.trim()}>
              {chatBusy ? 'Thinking…' : 'Send to my Muse'}
            </button>
            {chatResult && !chatResult.usedMuse && <span className={styles.offline}>Muse offline: keyword rules used</span>}
          </div>
          {chatResult && (
            <div style={{marginTop: 12}}>
              <div className={styles.small} style={{marginBottom: 6}}>
                Here&apos;s what I got. Tap to toggle, then check the answers below.
              </div>
              <div className={styles.chips}>
                {chatTags.map((t, i) => chip(t.on, `${t.tag} · ${t.kind}`, () => setChatTags(ts => ts.map((x, j) => (i === j ? {...x, on: !x.on} : x)))))}
                {!chatTags.length && <span className={styles.small}>No tags spotted; pick some on the previous step.</span>}
              </div>
            </div>
          )}
        </div>
      )}
      <div className={styles.card}>
        <h2 className={styles.h2}>1. How many days a week do you move for 30+ minutes?</h2>
        <div className={styles.chips}>{WEEKLY_OPTIONS.map(o => chip(a.weeklyActiveDays === o, WEEKLY_LABEL[o], () => setA({...a, weeklyActiveDays: o})))}</div>
      </div>
      <div className={styles.card}>
        <h2 className={styles.h2}>2. One goal for the next 4 weeks</h2>
        <div className={styles.chips}>{GOALS.map(g => chip(a.primaryGoal === g, g, () => setA({...a, primaryGoal: g})))}</div>
      </div>
      <div className={styles.card}>
        <h2 className={styles.h2}>3. When do you usually have time?</h2>
        <div className={styles.chips}>
          {SCHEDULE_OPTIONS.map(s => {
            const on = (a.schedule ?? []).includes(s);
            return chip(on, s, () => setA({...a, schedule: on ? (a.schedule ?? []).filter(x => x !== s) : [...(a.schedule ?? []), s]}));
          })}
        </div>
      </div>
      <div className={styles.card}>
        <h2 className={styles.h2}>4. Who with?</h2>
        <div className={styles.chips}>{WITH_WHOM_OPTIONS.map(o => chip(a.withWhom === o.id, o.label, () => setA({...a, withWhom: o.id})))}</div>
      </div>
      <div className={styles.card}>
        <h2 className={styles.h2}>5. Anything your Muse should go easy on?</h2>
        <p className={styles.small} style={{marginBottom: 6}}>
          Muse-only. Never shown to anyone, never used as a label; it only shapes your targets.
        </p>
        <input className={styles.input} value={a.goEasyNote ?? ''} onChange={e => setA({...a, goEasyNote: e.target.value})} placeholder="Optional: “left knee”, “low impact only”, “new to this”" aria-label="Go easy on" />
        <label className={styles.row} style={{marginTop: 12, cursor: 'pointer'}}>
          <input type="checkbox" checked={Boolean(a.interestSuggestionsEnabled)} onChange={e => setA({...a, interestSuggestionsEnabled: e.target.checked})} />
          <span className={styles.small}>Let my Muse suggest tags from what I like on Facebook (off by default; you confirm each one).</span>
        </label>
      </div>
    </StepShell>
  );
}
