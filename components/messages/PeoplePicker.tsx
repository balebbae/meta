'use client';
import {useEffect, useState} from 'react';
import {CheckIcon, CloseIcon} from '@/components/icons';
import type {ChatUser} from '@/lib/messaging-types';
import {chatApi} from './api';
import {ChatAvatar} from './ChatAvatar';
import styles from './messages.module.css';

/** "To:" bar with chips + a search-driven list of people. `exclude` hides ids already in the chat. */
export function PeoplePicker({
  selected,
  onChange,
  exclude = [],
  suggestions = [],
  autoFocus,
  label = 'To:',
}: {
  selected: ChatUser[];
  onChange: (next: ChatUser[]) => void;
  exclude?: number[];
  suggestions?: ChatUser[];
  autoFocus?: boolean;
  label?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ChatUser[] | null>(null);

  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      chatApi
        .searchUsers(needle)
        .then(d => !cancelled && setResults(d.users))
        .catch(() => !cancelled && setResults([]));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const toggle = (u: ChatUser) => {
    if (selected.some(s => s.id === u.id)) onChange(selected.filter(s => s.id !== u.id));
    else onChange([...selected, u]);
    setQ('');
  };
  const hidden = new Set(exclude);
  const list = (results ?? suggestions).filter(u => !hidden.has(u.id));

  return (
    <>
      <div className={styles.toBar}>
        <span className={styles.toLabel}>{label}</span>
        {selected.map(u => (
          <span key={u.id} className={styles.chipUser}>
            {u.name}
            <button type="button" aria-label={`Remove ${u.name}`} onClick={() => toggle(u)}>
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={selected.length ? '' : 'Type a name'}
          aria-label="Search people"
          autoFocus={autoFocus}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !q && selected.length) onChange(selected.slice(0, -1));
          }}
        />
      </div>
      <div className={styles.pickerList}>
        {!q && suggestions.length > 0 && <div className={styles.pickerHeading}>Suggested</div>}
        {list.map(u => {
          const on = selected.some(s => s.id === u.id);
          return (
            <button key={u.id} type="button" className={styles.pickerRow} onClick={() => toggle(u)} aria-pressed={on}>
              <ChatAvatar src={u.avatarUrl} size={36} online={u.isOnline} />
              <span>{u.name}</span>
              <span className={`${styles.pickerCheck} ${on ? styles.pickerChecked : ''}`}>{on && <CheckIcon size={14} />}</span>
            </button>
          );
        })}
        {q && results && results.length === 0 && <div className={styles.empty}>No people found</div>}
      </div>
    </>
  );
}
