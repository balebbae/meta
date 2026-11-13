'use client';
import {useRouter} from 'next/navigation';
import {useState, type ReactNode} from 'react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {VStack} from '@astryxdesign/core/VStack';
import {INVITE_STEPS, ONBOARDING_STEPS, nextStep, type OnboardingStep} from '@/lib/activities/onboarding';

export const STEP_TITLE: Record<OnboardingStep, string> = {tags: "What you're into", questions: 'Five quick questions', connect: 'Where your workouts come from', privacy: 'What your Muse may say', muse: 'Meet your Muse'};
const STEP_SHORT: Record<OnboardingStep, string> = {tags: 'Interests', questions: 'Questions', connect: 'Sources', privacy: 'Privacy', muse: 'Your Muse'};

export function exitHref(invite: number | null): string {
  return invite ? `/games/${invite}?consent=1` : '/activities';
}

/** Stepper + Back / Skip / Continue. `save` runs before advancing and may throw to stay on the step. */
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
    <VStack gap={4} paddingBlock={4}>
      <Stepper activeStep={idx} label={`Step ${idx + 1} of ${steps.length}`} density="compact" horizontalOptions={{minimumStepWidth: 88, collapsedVariant: 'withLabel'}}>
        {steps.map((s, i) => (
          <Step key={s} step={i + 1} label={STEP_SHORT[s]} status={i < idx ? 'success' : 'accent'} />
        ))}
      </Stepper>
      <Heading level={1}>{STEP_TITLE[step]}</Heading>
      {children}
      {err && <Banner status="error" title={err} />}
      <HStack gap={2} vAlign="center" justify="between">
        {idx > 0 ? <Button label="Back" href={`/activities/onboarding/${steps[idx - 1]}${q}`} /> : <Button label="Exit" variant="ghost" href={exitHref(null)} />}
        <HStack gap={2}>
          {skippable && <Button label="Skip" variant="ghost" isDisabled={busy} onClick={() => void go(true)} />}
          <Button label={continueLabel} variant="primary" isLoading={busy} onClick={() => void go(false)} />
        </HStack>
      </HStack>
    </VStack>
  );
}
