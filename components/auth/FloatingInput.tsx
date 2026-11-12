'use client';
import styles from '@/components/auth/auth.module.css';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  name?: string;
  autoComplete?: string;
  error?: string | null;
  autoFocus?: boolean;
};

/** Facebook-style 60px rounded field with a label that floats up on focus / when filled. */
export function FloatingInput({label, value, onChange, type = 'text', name, autoComplete, error, autoFocus}: Props) {
  return (
    <div className={styles.field}>
      <label className={`${styles.inputBox} ${error ? styles.inputBoxError : ''}`}>
        <input
          className={styles.input}
          type={type}
          name={name}
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder=" "
          aria-label={label}
          aria-invalid={Boolean(error)}
          onChange={e => onChange(e.target.value)}
        />
        <span className={styles.floatingLabel}>{label}</span>
      </label>
      {error ? <div className={styles.fieldError}>{error}</div> : null}
    </div>
  );
}
