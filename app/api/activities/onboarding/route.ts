import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {getProfile, ONBOARDING_STEPS, saveHero, saveStarterAnswers, setOnboardingStep, snoozeIntro, type OnboardingState, type StarterAnswers} from '@/lib/activities/onboarding';
import {parseHero} from '@/lib/kingdom/cast';
import {replaceSelectedTags} from '@/lib/activities/tags';
import type {TagKind, TagVisibility} from '@/lib/activities/types';

type Body = {
  action?: 'snooze' | 'start' | 'step' | 'done';
  step?: OnboardingState;
  answers?: StarterAnswers;
  hero?: unknown;
  tags?: {tag: string; kind: TagKind; visibility?: TagVisibility}[];
};

const VALID: OnboardingState[] = ['intro', ...ONBOARDING_STEPS, 'done'];

/** POST: save onboarding progress / answers / tags. */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<Body>(req);
    if (!body) return badRequest('Invalid JSON');
    if (body.action === 'snooze') {
      await snoozeIntro(user.id, 30);
      return NextResponse.json({ok: true, snoozed: true});
    }
    if (body.tags) {
      const kinds = [...new Set(body.tags.map(t => t.kind))] as TagKind[];
      await replaceSelectedTags(user.id, body.tags.slice(0, 40), kinds.length ? kinds : ['activity', 'goal', 'style']);
    }
    if (body.answers) await saveStarterAnswers(user.id, body.answers);
    if ('hero' in body) {
      const hero = parseHero(body.hero);
      if (hero === null && body.hero !== null) return badRequest('Unknown hero');
      await saveHero(user.id, hero);
    }
    if (body.step) {
      if (!VALID.includes(body.step)) return badRequest('Unknown step');
      await setOnboardingStep(user.id, body.step);
    } else if (body.action === 'start') {
      await setOnboardingStep(user.id, 'character');
    } else if (body.action === 'done') {
      await setOnboardingStep(user.id, 'done');
    }
    return NextResponse.json({ok: true, profile: await getProfile(user.id)});
  });
}
