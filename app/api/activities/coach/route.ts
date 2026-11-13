import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {buildReport, getCoach, setCoachMode} from '@/lib/activities/coach';

export const maxDuration = 60;

/** GET → {enabled, blocked, report}; builds today's report on first open. */
export async function GET() {
  return withUser(async user => NextResponse.json(await getCoach(user.id)));
}

/** POST {action: 'enable' | 'disable' | 'refresh', deleteHistory?} */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{action?: string; deleteHistory?: boolean}>(req);
    if (body?.action === 'enable' || body?.action === 'disable') {
      await setCoachMode(user.id, body.action === 'enable', body.deleteHistory === true);
      return NextResponse.json(await getCoach(user.id));
    }
    if (body?.action !== 'refresh') return badRequest('action must be enable, disable or refresh');
    const state = await getCoach(user.id);
    if (!state.enabled || state.blocked) return NextResponse.json(state);
    // one paid Muse plan per 2 minutes, so double taps don't re-run it
    if (state.report && Date.now() - Date.parse(state.report.generatedAt) < 120_000) return NextResponse.json(state);
    return NextResponse.json({...state, report: await buildReport(user.id)});
  });
}
