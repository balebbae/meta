'use client';
import {AlertCircle} from '@/components/auth/logos';
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
  inputMode?: 'text' | 'email' | 'tel';
};

/** Facebook-style 60px rounded field with a label that floats up on focus / when filled. */
export function FloatingInput({label, value, onChange, type = 'text', name, autoComplete, error, autoFocus, inputMode}: Props) {
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
          inputMode={inputMode}
          placeholder=" "
          aria-label={label}
          aria-invalid={Boolean(error)}
          onChange={e => onChange(e.target.value)}
        />
        <span className={styles.floatingLabel}>{label}</span>
      </label>
      {error ? (
        <div className={styles.fieldError} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
