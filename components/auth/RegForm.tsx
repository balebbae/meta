'use client';
import {useState} from 'react';
import Link from 'next/link';
import {EmailPassword, initSuperTokensFrontend} from '@/lib/supertokens/frontend';
import {FloatingInput} from '@/components/auth/FloatingInput';
import {RegSelect, type Option} from '@/components/auth/RegSelect';
import {ProfilePictureDialog} from '@/components/auth/ProfilePictureDialog';
import {AlertCircle, HelpCircle} from '@/components/auth/logos';
import styles from '@/components/auth/auth.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS: Option[] = MONTH_NAMES.map((m, i) => ({value: String(i + 1), label: m}));
const DAYS: Option[] = Array.from({length: 31}, (_, i) => ({value: String(i + 1), label: String(i + 1)}));
const THIS_YEAR = new Date().getFullYear();
const YEARS: Option[] = Array.from({length: 120}, (_, i) => ({value: String(THIS_YEAR - i), label: String(THIS_YEAR - i)}));
const GENDERS: Option[] = [
  {value: 'female', label: 'Female'},
  {value: 'male', label: 'Male'},
  {value: 'custom', label: 'Custom'},
];
const PRONOUNS: Option[] = [
  {value: 'she', label: 'She: "Wish her a happy birthday!"'},
  {value: 'he', label: 'He: "Wish him a happy birthday!"'},
  {value: 'they', label: 'They: "Wish them a happy birthday!"'},
];

const COPY = {
  firstName: 'What\u2019s your first name?',
  lastName: 'What\u2019s your last name?',
  birthday: 'Select your birthday. You can change who can see this later.',
  gender: 'Please choose a gender. You can change who can see this later.',
  pronoun: 'Please select your pronoun.',
  contact: 'Please enter a valid mobile number or email address.',
  password: 'Enter a combination of at least six numbers, letters and punctuation marks (like ! and &).',
};

type Errors = Partial<Record<keyof typeof COPY | 'form', string>>;

function validBirthday(y: string, m: string, d: string) {
  if (!y || !m || !d) return false;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.getUTCMonth() === Number(m) - 1 && date.getTime() <= Date.now();
}

export function RegForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [pronoun, setPronoun] = useState('');
  const [customGender, setCustomGender] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);

  /** Like facebook.com, a field's error clears as soon as the field is edited. */
  function edit<T>(set: (v: T) => void, ...keys: (keyof Errors)[]) {
    return (v: T) => {
      set(v);
      setErrors(prev => (keys.some(k => prev[k]) ? Object.fromEntries(Object.entries(prev).filter(([k]) => !keys.includes(k as keyof Errors))) : prev));
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!firstName.trim()) next.firstName = COPY.firstName;
    if (!lastName.trim()) next.lastName = COPY.lastName;
    if (!validBirthday(year, month, day)) next.birthday = COPY.birthday;
    if (!gender) next.gender = COPY.gender;
    if (gender === 'custom' && !pronoun) next.pronoun = COPY.pronoun;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) next.contact = COPY.contact;
    if (password.length < 6) next.password = COPY.password;
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      initSuperTokensFrontend();
      const res = await EmailPassword.signUp({
        formFields: [
          {id: 'email', value: contact.trim()},
          {id: 'password', value: password},
          {id: 'firstName', value: firstName.trim()},
          {id: 'lastName', value: lastName.trim()},
          {id: 'birthday', value: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`},
          {id: 'gender', value: gender},
          {id: 'pronoun', value: gender === 'custom' ? pronoun : ''},
          {id: 'customGender', value: gender === 'custom' ? customGender.trim() : ''},
        ],
      });
      if (res.status === 'OK') {
        setCreatedName(`${firstName.trim()} ${lastName.trim()}`);
        return;
      }
      if (res.status === 'FIELD_ERROR') {
        const fieldErrors: Errors = {};
        for (const f of res.formFields) {
          if (f.id === 'email') fieldErrors.contact = /already exists/i.test(f.error) ? 'There is an existing account associated with this email address. Log in instead.' : COPY.contact;
          else if (f.id === 'password') fieldErrors.password = COPY.password;
          else fieldErrors.form = f.error;
        }
        setErrors(fieldErrors);
      } else {
        setErrors({form: 'Sign up is not available right now. Please try again later.'});
      }
    } catch {
      setErrors({form: 'Something went wrong. Please try again.'});
    } finally {
      setBusy(false);
    }
  }

  // A full navigation (not router.push) so the signed-in shell loads with the new session cookie and avatar.
  const finish = () => window.location.assign('/');

  return (
    <>
      <form className={styles.regForm} onSubmit={onSubmit} noValidate>
        <h2 className={styles.sectionTitle}>Name</h2>
        <div className={styles.row2}>
          <FloatingInput label="First name" name="firstname" autoComplete="given-name" value={firstName} onChange={edit(setFirstName, 'firstName')} error={errors.firstName} />
          <FloatingInput label="Last name" name="lastname" autoComplete="family-name" value={lastName} onChange={edit(setLastName, 'lastName')} error={errors.lastName} />
        </div>

        <h2 className={`${styles.sectionTitle} ${styles.sectionGap}`} style={{marginBottom: 12}}>
          Birthday
          <button type="button" className={styles.helpBtn} aria-label="Why do I need to provide my birthday?" title="Providing your birthday helps make sure you get the right Facebook experience for your age.">
            <HelpCircle />
          </button>
        </h2>
        <div className={styles.row3}>
          <RegSelect label="Month" options={MONTHS} value={month} onChange={edit(setMonth, 'birthday')} error={errors.birthday ? '' : null} />
          <RegSelect label="Day" options={DAYS} value={day} onChange={edit(setDay, 'birthday')} error={errors.birthday ? '' : null} />
          <RegSelect label="Year" options={YEARS} value={year} onChange={edit(setYear, 'birthday')} error={errors.birthday ? '' : null} />
        </div>
        {errors.birthday ? (
          <div className={styles.fieldError} role="alert">
            {errors.birthday}
          </div>
        ) : null}

        <h2 className={`${styles.sectionTitle} ${styles.sectionGap}`} style={{marginBottom: 12}}>
          Gender
          <button type="button" className={styles.helpBtn} aria-label="Why do I need to provide my gender?" title="You can change who sees your gender on your profile later. Select Custom to choose another gender, or if you'd rather not say.">
            <HelpCircle />
          </button>
        </h2>
        <RegSelect label="Select your gender" options={GENDERS} value={gender} onChange={edit(setGender, 'gender')} error={errors.gender} />
        {gender === 'custom' ? (
          <>
            <div style={{marginTop: 12}}>
              <RegSelect label="Select your pronoun" options={PRONOUNS} value={pronoun} onChange={edit(setPronoun, 'pronoun')} error={errors.pronoun} />
            </div>
            <p className={styles.subtle}>Your pronoun is visible to everyone</p>
            <div style={{marginTop: 12}}>
              <FloatingInput label="Gender (optional)" name="custom_gender" value={customGender} onChange={setCustomGender} />
            </div>
          </>
        ) : null}

        <h2 className={styles.sectionTitle} style={{marginTop: gender === 'custom' ? 12 : 19}}>
          Mobile number or email
        </h2>
        <FloatingInput label="Mobile number or email" name="reg_email__" autoComplete="email" inputMode="email" value={contact} onChange={edit(setContact, 'contact')} error={errors.contact} />
        <p className={styles.helper} style={{marginTop: 4}}>
          You may receive notifications from us.{' '}
          <a className={styles.blueLink} href="#">
            Learn why we ask for your contact information
          </a>
        </p>

        <h2 className={styles.sectionTitle} style={{marginTop: 14}}>
          Password
        </h2>
        <FloatingInput label="Password" name="reg_passwd__" type="password" autoComplete="new-password" value={password} onChange={edit(setPassword, 'password')} error={errors.password} />

        <div className={styles.legal}>
          <p>
            People who use our service may have uploaded your contact information to Facebook.{' '}
            <a className={styles.blueLink} href="#">
              Learn more
            </a>
            .
          </p>
          <p>
            By tapping Submit, you agree to create an account and to Facebook&rsquo;s{' '}
            <a className={styles.blueLink} href="#">
              Terms
            </a>
            ,{' '}
            <a className={styles.blueLink} href="#">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a className={styles.blueLink} href="#">
              Cookies Policy
            </a>
            .
          </p>
          <p>
            The{' '}
            <a className={styles.blueLink} href="#">
              Privacy Policy
            </a>{' '}
            describes the ways we can use the information we collect when you create an account. For example, we use this information to provide, personalize and improve our products, including ads.
          </p>
        </div>

        {errors.form ? <FieldError text={errors.form} /> : null}
        <button className={`${styles.primaryBtn} ${styles.submitBtn}`} type="submit" disabled={busy}>
          {busy ? 'Submitting\u2026' : 'Submit'}
        </button>
        <Link className={styles.greyBtn} href="/auth">
          I already have an account
        </Link>
      </form>
      {createdName ? <ProfilePictureDialog name={createdName} onDone={finish} /> : null}
    </>
  );
}

function FieldError({text}: {text: string}) {
  return (
    <div className={styles.fieldError} role="alert">
      <AlertCircle size={16} />
      <span>{text}</span>
    </div>
  );
}
