'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {EmailPassword, initSuperTokensFrontend} from '@/lib/supertokens/frontend';
import {FloatingInput} from '@/components/auth/FloatingInput';
import Link from 'next/link';
import {MetaWordmark} from '@/components/auth/logos';
import styles from '@/components/auth/auth.module.css';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
    if (!email.trim()) {
      setEmailError('The email address or mobile number you entered isn\u2019t connected to an account.');
      return;
    }
    if (!password) {
      setPasswordError('The password you\u2019ve entered is incorrect.');
      return;
    }
    setBusy(true);
    try {
      initSuperTokensFrontend();
      const res = await EmailPassword.signIn({
        formFields: [
          {id: 'email', value: email.trim()},
          {id: 'password', value: password},
        ],
      });
      if (res.status === 'OK') {
        router.push('/');
        router.refresh();
        return;
      }
      if (res.status === 'FIELD_ERROR') {
        for (const f of res.formFields) {
          if (f.id === 'email') setEmailError(f.error);
          else setPasswordError(f.error);
        }
      } else if (res.status === 'WRONG_CREDENTIALS_ERROR') {
        setPasswordError('The password you\u2019ve entered is incorrect.');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className={styles.loginForm} onSubmit={onSubmit} noValidate>
        <h2 className={styles.loginTitle}>Log into Facebook</h2>
        <FloatingInput
          label="Email or mobile number"
          name="email"
          type="text"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          error={emailError}
          autoFocus
        />
        <FloatingInput
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={passwordError}
        />
        {formError ? <div className={styles.fieldError}>{formError}</div> : null}
        <button className={styles.primaryBtn} type="submit" disabled={busy}>
          {busy ? 'Logging in\u2026' : 'Log in'}
        </button>
        <a className={styles.textBtn} href="#" onClick={e => e.preventDefault()}>
          Forgot password?
        </a>
        <Link className={styles.outlineBtn} href="/auth/reg">
          Create new account
        </Link>
        <div className={styles.metaMark}>
          <MetaWordmark height={12} />
        </div>
      </form>
    </>
  );
}
