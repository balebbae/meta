'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {EmailPassword, initSuperTokensFrontend} from '@/lib/supertokens/frontend';
import {FloatingInput} from '@/components/auth/FloatingInput';
import styles from '@/components/auth/auth.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);

type Errors = Partial<Record<'firstName' | 'lastName' | 'email' | 'password' | 'form', string>>;

export function SignUpDialog({onClose}: {onClose: () => void}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'custom' | ''>('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!firstName.trim()) next.firstName = 'What\u2019s your name?';
    if (!lastName.trim()) next.lastName = 'What\u2019s your name?';
    if (!email.trim()) next.email = 'You\u2019ll use this when you log in and if you ever need to reset your password.';
    if (!password) next.password = 'Enter a combination of at least six numbers, letters and punctuation marks (like ! and &).';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      initSuperTokensFrontend();
      const res = await EmailPassword.signUp({
        formFields: [
          {id: 'email', value: email.trim()},
          {id: 'password', value: password},
          {id: 'firstName', value: firstName.trim()},
          {id: 'lastName', value: lastName.trim()},
        ],
      });
      if (res.status === 'OK') {
        router.push('/');
        router.refresh();
        return;
      }
      if (res.status === 'FIELD_ERROR') {
        const fe: Errors = {};
        for (const f of res.formFields) {
          const msg =
            f.id === 'email' && /already exists/i.test(f.error)
              ? 'There is already an account with this email address.'
              : f.error;
          fe[f.id as keyof Errors] = msg;
        }
        setErrors(fe);
      } else {
        setErrors({form: 'Sign up is not allowed right now. Please try again.'});
      }
    } catch {
      setErrors({form: 'Something went wrong. Please try again.'});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="signup-title">
        <div className={styles.dialogHeader}>
          <h2 id="signup-title" className={styles.dialogTitle}>
            Create a new account
          </h2>
          <p className={styles.dialogSubtitle}>It&apos;s quick and easy.</p>
          <button className={styles.closeBtn} type="button" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <form className={styles.dialogBody} onSubmit={onSubmit} noValidate>
          <div className={styles.nameRow}>
            <FloatingInput label="First name" name="firstName" autoComplete="given-name" value={firstName} onChange={setFirstName} error={errors.firstName} autoFocus />
            <FloatingInput label="Last name" name="lastName" autoComplete="family-name" value={lastName} onChange={setLastName} error={errors.lastName} />
          </div>
          <FloatingInput label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
          <FloatingInput label="New password" name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} />

          <div className={styles.groupLabel}>
            Birthday
            <span className={styles.helpIcon} aria-hidden>
              ?
            </span>
          </div>
          <div className={styles.selectRow}>
            <select className={styles.select} defaultValue="Jan" aria-label="Month">
              {MONTHS.map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select className={styles.select} defaultValue={1} aria-label="Day">
              {Array.from({length: 31}, (_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
            <select className={styles.select} defaultValue={2000} aria-label="Year">
              {YEARS.map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className={styles.groupLabel}>
            Gender
            <span className={styles.helpIcon} aria-hidden>
              ?
            </span>
          </div>
          <div className={styles.selectRow}>
            {(['female', 'male', 'custom'] as const).map(g => (
              <label key={g} className={`${styles.radioBox} ${gender === g ? styles.radioBoxActive : ''}`}>
                <span className={styles.radioText}>{g[0].toUpperCase() + g.slice(1)}</span>
                <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} />
              </label>
            ))}
          </div>

          <p className={styles.legal}>
            People who use our service may have uploaded your contact information to Facebook.{' '}
            <a href="#" onClick={e => e.preventDefault()}>Learn more.</a>
          </p>
          <p className={styles.legal}>
            By clicking Sign Up, you agree to our <a href="#" onClick={e => e.preventDefault()}>Terms</a>,{' '}
            <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a> and{' '}
            <a href="#" onClick={e => e.preventDefault()}>Cookies Policy</a>. You may receive SMS notifications from us and can opt out at any time.
          </p>
          {errors.form ? <div className={styles.fieldError}>{errors.form}</div> : null}
          <button className={styles.signUpBtn} type="submit" disabled={busy}>
            {busy ? 'Signing up\u2026' : 'Sign Up'}
          </button>
          <button className={styles.linkBtn} type="button" onClick={onClose}>
            Already have an account?
          </button>
        </form>
      </div>
    </div>
  );
}
