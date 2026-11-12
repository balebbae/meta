import {NextResponse} from 'next/server';
import {badRequest, notFound, readJson, withUser} from '@/lib/api';
import {isQuestMember} from '@/lib/rally/queries';
import {DEFAULT_SPOTS, shareQuestToGroups, shareTargets} from '@/lib/rally/groups';

type Ctx = {params: Promise<{id: string}>};

/** The viewer's groups for "Post to groups", relevant first. Quest members only. */
export async function GET(_req: Request, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!id || !(await isQuestMember(id, user.id))) return notFound();
    const targets = await shareTargets(id, user.id);
    return targets ? NextResponse.json(targets) : notFound();
  });
}

/** Body: {groupIds: number[], spots?: number, note?: string} -> one sign-up post per group. */
export async function POST(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    if (!id || !(await isQuestMember(id, user.id))) return notFound();
    const body = await readJson<{groupIds?: unknown; spots?: unknown; note?: unknown}>(req);
    const groupIds = Array.isArray(body?.groupIds) ? body.groupIds.map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 20) : [];
    if (!groupIds.length) return badRequest('Pick at least one group');
    const spots = body?.spots == null ? DEFAULT_SPOTS : Number(body.spots);
    if (!Number.isFinite(spots) || spots < 2 || spots > 100) return badRequest('Spots must be between 2 and 100');
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : '';
    const posted = await shareQuestToGroups(id, user, groupIds, spots, note);
    return NextResponse.json({posted}, {status: 201});
  });
}
