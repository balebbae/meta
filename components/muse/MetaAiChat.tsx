'use client';

import {useState} from 'react';
import styles from '@/components/pages/simple.module.css';

type Line = {role: 'you' | 'ai'; text: string};

export function MetaAiChat() {
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const message = text.trim();
    if (!message || busy) return;
    setText('');
    setError(null);
    setLines(current => [...current, {role: 'you', text: message}]);
    setBusy(true);
    try {
      const res = await fetch('/api/muse/chat', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({message}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Meta AI could not answer');
      setLines(current => [...current, {role: 'ai', text: String(data.reply)}]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Meta AI could not answer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Meta AI</h1>
        <p className={styles.sub}>Ask a question. Answers come from Muse on this server.</p>
        {lines.map((line, i) => (
          <div key={i} className={styles.bubble}>{line.role === 'you' ? 'You: ' : 'Meta AI: '}{line.text}</div>
        ))}
        <textarea className={styles.field} rows={3} maxLength={2000} placeholder="Ask Meta AI" value={text} onChange={e => setText(e.target.value)} style={{marginTop: 12}} />
        <div className={styles.actions}>
          <button type="button" className="fb-btn-primary" disabled={busy || !text.trim()} onClick={send}>{busy ? 'Thinking…' : 'Send'}</button>
        </div>
        {error && <p className={styles.note}>{error}</p>}
      </section>
    </div>
  );
}
