import {sql} from '@/lib/db';
import type {HeroPick} from '@/lib/kingdom/cast';

/** Onboarding steps in order (§4). 'intro' = never started, 'done' = finished. */
export const ONBOARDING_STEPS = ['character', 'tags', 'questions', 'connect', 'privacy', 'muse'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingState = 'intro' | OnboardingStep | 'done';

/** Minimal accept flow from an invite (§10.2): tags -> privacy summary -> game consent (owned by Turf). */
export const INVITE_STEPS: OnboardingStep[] = ['tags', 'privacy'];

export type ActivityProfile = {
  userId: number;
  weeklyActiveDays: string | null;
  primaryGoal: string | null;
  schedule: string[];
  withWhom: string | null;
  goEasyNote: string | null;
  interestSuggestionsEnabled: boolean;
  onboardingStep: OnboardingState;
  modalSnoozedUntil: string | null;
  updatedAt: string | null;
};

function mapProfile(userId: number, r: Record<string, unknown> | undefined): ActivityProfile {
  return {
    userId,
    weeklyActiveDays: (r?.weekly_active_days as string | null) ?? null,
    primaryGoal: (r?.primary_goal as string | null) ?? null,
    schedule: (r?.schedule as string[] | null) ?? [],
    withWhom: (r?.with_whom as string | null) ?? null,
    goEasyNote: (r?.go_easy_note as string | null) ?? null,
    interestSuggestionsEnabled: Boolean(r?.interest_suggestions_enabled),
    onboardingStep: ((r?.onboarding_step as string | undefined) ?? 'intro') as OnboardingState,
    modalSnoozedUntil: r?.modal_snoozed_until ? String(r.modal_snoozed_until) : null,
    updatedAt: r?.updated_at ? String(r.updated_at) : null,
  };
}

/** Owner-only. go_easy_note is muse_only: never return it to anyone but the owner. */
export async function getProfile(userId: number): Promise<ActivityProfile> {
  const rows = await sql`select * from activity_profiles where user_id = ${userId}`;
  return mapProfile(userId, rows[0]);
}

export function hasOnboarded(p: ActivityProfile): boolean {
  return p.onboardingStep === 'done';
}

/**
 * OnboardingGate helper for Discover and other /activities routes: show the intro modal once when the
 * user has never started onboarding and hasn't said "Not now" in the last 30 days (§8).
 */
export async function shouldShowIntro(userId: number): Promise<boolean> {
  const p = await getProfile(userId);
  if (p.onboardingStep !== 'intro') return false;
  if (p.modalSnoozedUntil && new Date(p.modalSnoozedUntil).getTime() > Date.now()) return false;
  return true;
}

export async function snoozeIntro(userId: number, days = 30): Promise<void> {
  await sql`
    insert into activity_profiles (user_id, modal_snoozed_until) values (${userId}, now() + make_interval(days => ${days}))
    on conflict (user_id) do update set modal_snoozed_until = excluded.modal_snoozed_until, updated_at = now()`;
}

export async function setOnboardingStep(userId: number, step: OnboardingState): Promise<void> {
  await sql`
    insert into activity_profiles (user_id, onboarding_step) values (${userId}, ${step})
    on conflict (user_id) do update set onboarding_step = excluded.onboarding_step, updated_at = now()`;
}

export async function saveHero(userId: number, hero: HeroPick | null): Promise<void> {
  await sql`update users set hero = ${hero === null ? null : JSON.stringify(hero)} where id = ${userId}`;
}

export type StarterAnswers = {
  weeklyActiveDays?: string | null;
  primaryGoal?: string | null;
  schedule?: string[] | null;
  withWhom?: string | null;
  goEasyNote?: string | null;
  interestSuggestionsEnabled?: boolean | null;
};

export async function saveStarterAnswers(userId: number, a: StarterAnswers): Promise<void> {
  await sql`
    insert into activity_profiles (user_id, weekly_active_days, primary_goal, schedule, with_whom, go_easy_note, interest_suggestions_enabled)
    values (${userId}, ${a.weeklyActiveDays ?? null}, ${a.primaryGoal ?? null}, ${a.schedule ?? null}, ${a.withWhom ?? null}, ${a.goEasyNote ?? null}, ${a.interestSuggestionsEnabled ?? false})
    on conflict (user_id) do update set
      weekly_active_days = coalesce(excluded.weekly_active_days, activity_profiles.weekly_active_days),
      primary_goal = coalesce(excluded.primary_goal, activity_profiles.primary_goal),
      schedule = coalesce(excluded.schedule, activity_profiles.schedule),
      with_whom = coalesce(excluded.with_whom, activity_profiles.with_whom),
      go_easy_note = coalesce(excluded.go_easy_note, activity_profiles.go_easy_note),
      interest_suggestions_enabled = coalesce(${a.interestSuggestionsEnabled ?? null}, activity_profiles.interest_suggestions_enabled),
      updated_at = now()`;
}

export function nextStep(current: OnboardingStep, invite: boolean): OnboardingStep | 'done' {
  const steps = invite ? INVITE_STEPS : [...ONBOARDING_STEPS];
  const i = steps.indexOf(current);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : 'done';
}
