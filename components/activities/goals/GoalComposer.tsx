'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {usePanelNav} from '../panels/nav';
import h from '../home/home.module.css';
import p from '../panels/panels.module.css';

const EXAMPLES = ['Compete in a HYROX in March', 'Run my first 5K', 'Half marathon this spring', 'Do 10 pull-ups in a row'];

export function GoalComposer() {
  const router = useRouter();
  const {open} = usePanelNav();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text})});
      const d = (await res.json().catch(() => ({}))) as {goal?: {id: number}; error?: string};
      if (!res.ok || !d.goal) throw new Error(d.error ?? 'Could not build the roadmap. Try again.');
      setBusy(false);
      setText('');
      open({panel: 'goals', goal: d.goal.id});
      router.refresh(); // the hero ring picks up the new goal
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the roadmap.');
      setBusy(false);
    }
  };

  return (
    <div className={p.stack} aria-busy={busy}>
      <label className={p.field}>
        What are you training for?
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="I want to compete in a HYROX in March" maxLength={300} rows={2} disabled={busy} />
      </label>
      <div className={p.pills} role="group" aria-label="Examples">
        {EXAMPLES.map(x => (
          <button key={x} type="button" className={`${h.pill} ${h.pillSm} ${h.pillOutline}`} disabled={busy} onClick={() => setText(x)}>
            {x}
          </button>
        ))}
      </div>
      <div className={p.actions}>
        <button type="button" className={`${h.pill} ${h.pillSm} ${h.pillBlue}`} disabled={busy || text.trim().length < 3} onClick={() => void submit()}>
          {busy ? 'Planning…' : 'Build roadmap'}
        </button>
      </div>
      {error && <p className={p.error} role="alert">{error}</p>}
    </div>
  );
}
