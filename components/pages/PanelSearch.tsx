'use client';

import {useRouter, useSearchParams} from 'next/navigation';
import {useEffect, useState} from 'react';
import {SearchIcon} from './icons';
import styles from './secondary.module.css';

/** Writes `q` onto the current page so the server list can filter. */
export function PanelSearch({placeholder}: {placeholder: string}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');

  useEffect(() => {
    const current = params.get('q') ?? '';
    if (value.trim() === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      const q = value.trim();
      if (q) next.set('q', q);
      else next.delete('q');
      const query = next.toString();
      router.replace(query ? `?${query}` : '?', {scroll: false});
    }, 200);
    return () => clearTimeout(timer);
  }, [params, router, value]);

  return (
    <form className={styles.search} onSubmit={event => event.preventDefault()}>
      <SearchIcon />
      <input type="search" placeholder={placeholder} aria-label={placeholder} value={value} onChange={event => setValue(event.target.value)} />
    </form>
  );
}
