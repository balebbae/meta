'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {LabeledPost} from '@/lib/search';
import styles from './simple.module.css';

export function Board({
  title,
  blurb,
  prefix,
  placeholder,
  posts,
}: {
  title: string;
  blurb: string;
  prefix: string;
  placeholder: string;
  posts: LabeledPost[];
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({content: `${prefix}: ${body}`, audience: 'public'}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not post');
        return;
      }
      setText('');
      router.refresh();
    } catch {
      setError('Could not post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{blurb}</p>
        <textarea className={styles.field} rows={4} maxLength={500} placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} />
        <div className={styles.actions}>
          <button type="button" className="fb-btn-primary" disabled={busy || !text.trim()} onClick={share}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
        {error && <p className={styles.note}>{error}</p>}
      </section>
      <section className={styles.card}>
        {posts.length === 0 && <p className={styles.sub}>Nothing here yet.</p>}
        {posts.map(post => (
          <Link key={post.id} href={`/profile/${post.authorId}`} className={styles.row}>
            <span>
              {post.authorName}
              <span className={styles.hint}>{post.content.replace(new RegExp(`^${prefix}:\\s*`), '')}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
