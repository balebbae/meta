import {NextResponse, type NextRequest} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {dismissSuggestion, interestSuggestions, setInterestSuggestions} from '@/lib/activities/interests';

export const dynamic = 'force-dynamic';

export async function GET() {
  return withUser(async user => NextResponse.json(await interestSuggestions(user.id)));
}

/** POST {action: 'enable' | 'disable' | 'dismiss', tag?} — 'disable' clears all suggestions and turns the toggle off. */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{action?: string; tag?: string}>(req);
    if (body?.action === 'enable' || body?.action === 'disable') {
      await setInterestSuggestions(user.id, body.action === 'enable');
    } else if (body?.action === 'dismiss' && body.tag) {
      await dismissSuggestion(user.id, body.tag);
    } else return badRequest('unknown action');
    return NextResponse.json(await interestSuggestions(user.id));
  });
}
