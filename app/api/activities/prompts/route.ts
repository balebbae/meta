import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {allowedSurfaces, markPrompt, type PromptSurface} from '@/lib/activities/prompts';

const SURFACES: PromptSurface[] = ['event_train', 'group_rally', 'composer_turf', 'discover_interests', 'intro'];

/** GET ?surfaces=a,b → {allowed: {a: true, b: false}} */
export async function GET(req: NextRequest) {
  return withUser(async user => {
    const list = (req.nextUrl.searchParams.get('surfaces') ?? '').split(',').filter((s): s is PromptSurface => SURFACES.includes(s as PromptSurface));
    return NextResponse.json({allowed: await allowedSurfaces(user.id, list.length ? list : SURFACES)});
  });
}

/** POST {surface, action: 'shown' | 'snooze'} — "Not now" snoozes 30 days. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{surface?: string; action?: string}>(req);
    const surface = body?.surface as PromptSurface | undefined;
    if (!surface || !SURFACES.includes(surface)) return badRequest('unknown surface');
    const action = body?.action === 'snooze' ? 'snooze' : 'shown';
    return NextResponse.json({prompts: await markPrompt(user.id, surface, action)});
  });
}
