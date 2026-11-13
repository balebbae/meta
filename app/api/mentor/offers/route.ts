import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {deleteOffer, getOffer, isAdult, matchMentors, upsertOffer, type MentorConsent} from '@/lib/activities/mentor';
import {getUserTags} from '@/lib/activities/discover';

export const dynamic = 'force-dynamic';

/** My opt-in + people a few months ahead of me (identity hidden). */
export async function GET() {
  return withUser(async user => {
    const [offer, tags] = await Promise.all([getOffer(user.id), getUserTags(user.id)]);
    return NextResponse.json({offer, matches: await matchMentors(user.id, tags), adult: await isAdult(user.id)});
  });
}

export async function POST(req: NextRequest) {
  return withUser(async user => {
    const b = await readJson<{metric?: string; fromValue?: string; toValue?: string; weeks?: number; anonymous?: boolean; consent?: MentorConsent; confirm18?: boolean}>(req);
    if (!b) return badRequest('Invalid body');
    if (!b.confirm18) return badRequest('This is 18+; please confirm');
    if (!(await isAdult(user.id))) return badRequest('This is 18+ only');
    const weeks = Math.max(1, Math.min(104, Number(b.weeks) || 8));
    await upsertOffer(user.id, {metric: (b.metric ?? '').trim(), fromValue: (b.fromValue ?? '').trim(), toValue: (b.toValue ?? '').trim(), weeks, anonymous: b.anonymous !== false, consent: {workouts: !!b.consent?.workouts, steps: !!b.consent?.steps, heart: !!b.consent?.heart, sleep: !!b.consent?.sleep, offerText: (b.consent?.offerText ?? '').slice(0, 400), reviewBeforeSend: !!b.consent?.reviewBeforeSend}});
    return NextResponse.json({offer: await getOffer(user.id)});
  });
}

export async function DELETE() {
  return withUser(async user => {
    await deleteOffer(user.id);
    return NextResponse.json({ok: true});
  });
}
