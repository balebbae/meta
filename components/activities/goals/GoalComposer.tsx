'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import g from './goals.module.css';

const EXAMPLES = ['Compete in a HYROX in March', 'Run my first 5K', 'Half marathon this spring', 'Do 10 pull-ups in a row'];

export function GoalComposer() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text})});
      const d = (await res.json().catch(() => ({}))) as {goal?: {id: number}; error?: string};
      if (!res.ok || !d.goal) throw new Error(d.error ?? 'Could not build the roadmap. Try again.');
      router.push(`/activities/goals/${d.goal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the roadmap.');
      setBusy(false);
    }
  };

  return (
    <form className={g.card} onSubmit={submit} aria-busy={busy}>
      <label htmlFor="goal-text" className={g.h2}>
        What are you training for?
      </label>
      <p className={g.muted} style={{margin: '4px 0 10px'}}>
        Say it like you would to a friend. Your Muse builds a week-by-week roadmap from where you are now.
      </p>
      <textarea id="goal-text" className={g.textarea} value={text} onChange={e => setText(e.target.value)} placeholder="I want to compete in a HYROX in March" maxLength={300} disabled={busy} />
      <div className={g.examples} aria-label="Examples">
        {EXAMPLES.map(x => (
          <button key={x} type="button" className={g.example} onClick={() => setText(x)} disabled={busy}>
            {x}
          </button>
        ))}
      </div>
      <div className={g.row} style={{justifyContent: 'space-between'}}>
        <p className={g.disclaimer}>Planning help, not medical advice.</p>
        <button type="submit" className={g.btnPrimary} disabled={busy || text.trim().length < 3}>
          {busy ? 'Planning your weeks…' : 'Build my roadmap'}
        </button>
      </div>
      {error && (
        <p className={g.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
