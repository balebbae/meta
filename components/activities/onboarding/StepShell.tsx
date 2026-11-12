'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState, type ReactNode} from 'react';
import {INVITE_STEPS, ONBOARDING_STEPS, nextStep, type OnboardingStep} from '@/lib/activities/onboarding';
import styles from '../activities.module.css';

export const STEP_TITLE: Record<OnboardingStep, string> = {tags: "What you're into", questions: 'Five quick questions', connect: 'Where your workouts come from', privacy: 'What your Muse may say', muse: 'Meet your Muse'};

export function exitHref(invite: number | null): string {
  return invite ? `/games/${invite}?consent=1` : '/activities';
}

/** Progress bar + Back / Skip / Continue. `save` runs before advancing and may throw to stay on the step. */
export function StepShell({step, invite, children, save, skippable = true, continueLabel = 'Continue'}: {step: OnboardingStep; invite: number | null; children: ReactNode; save?: () => Promise<void>; skippable?: boolean; continueLabel?: string}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const steps = invite ? INVITE_STEPS : [...ONBOARDING_STEPS];
  const idx = steps.indexOf(step);
  const q = invite ? `?invite=${invite}` : '';

  async function go(skip: boolean) {
    setBusy(true);
    setErr(null);
    try {
      if (!skip && save) await save();
      const next = nextStep(step, Boolean(invite));
      await fetch('/api/activities/onboarding', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({step: next})});
      router.push(next === 'done' ? exitHref(invite) : `/activities/onboarding/${next}${q}`);
    } catch (e) {
      setErr((e as Error).message || 'Could not save');
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.progress} aria-label={`Step ${idx + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <span key={s} className={i <= idx ? styles.progressOn : styles.progressDot} />
        ))}
      </div>
      <h1 className={styles.h1}>{STEP_TITLE[step]}</h1>
      {children}
      {err && <div className={styles.err}>{err}</div>}
      <div className={styles.stepNav}>
        <span className={styles.row}>
          {idx > 0 ? (
            <Link href={`/activities/onboarding/${steps[idx - 1]}${q}`} className={styles.btn}>
              Back
            </Link>
          ) : (
            <Link href={exitHref(null)} className={styles.btnText}>
              Exit
            </Link>
          )}
        </span>
        <span className={styles.row}>
          {skippable && (
            <button className={styles.btnText} disabled={busy} onClick={() => void go(true)}>
              Skip
            </button>
          )}
          <button className={styles.btnPrimary} disabled={busy} onClick={() => void go(false)}>
            {busy ? 'Saving…' : continueLabel}
          </button>
        </span>
      </div>
    </main>
  );
}
