'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {AlertCircle, DownChevron} from '@/components/auth/logos';
import styles from '@/components/auth/auth.module.css';

export type Option = {value: string; label: string};

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
};

/** facebook.com/reg's 60px dropdown: floating label, 52px rows in a rounded popup, arrow-key / type-ahead navigation. */
export function RegSelect({label, options, value, onChange, error}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find(o => o.value === value);
  // An empty string marks the control invalid without a message (the birthday row shares one message).
  const invalid = error !== null && error !== undefined;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({block: 'nearest'});
  }, [open, active]);

  function toggle() {
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    setOpen(o => !o);
  }

  function pick(o: Option) {
    onChange(o.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        toggle();
      }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(options.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(0, a - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key.length === 1) {
      const i = options.findIndex(o => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div className={styles.selectWrap} ref={wrap}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        aria-invalid={invalid}
        className={`${styles.selectBtn} ${open ? styles.selectBtnOpen : ''} ${invalid ? styles.selectBtnError : ''}`}
        onClick={toggle}
        onKeyDown={onKeyDown}>
        <span className={`${styles.selectPlaceholder} ${selected ? styles.selectPlaceholderUp : ''}`}>{label}</span>
        {selected ? <span className={styles.selectValue}>{selected.label}</span> : null}
        <DownChevron className={styles.selectChevron} />
      </button>
      {open ? (
        <ul className={styles.menu} role="listbox" id={id} ref={list} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`${styles.menuItem} ${i === active ? styles.menuItemActive : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(o)}>
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <div className={styles.fieldError} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
