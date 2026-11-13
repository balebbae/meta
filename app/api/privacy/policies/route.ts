import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {getPolicies, setPolicy} from '@/lib/activities/policies';
import {clearAskCache} from '@/lib/activities/answers';
import {AUDIENCES, CATEGORIES, type Audience, type Category, type ShareLevel} from '@/lib/activities/types';

const LEVELS: ShareLevel[] = ['exact', 'rounded', 'boolean', 'muse_only', 'none'];

export async function GET() {
  return withUser(async user => NextResponse.json({policies: await getPolicies(user.id)}));
}

type Change = {category: Category; audience: Audience; level: ShareLevel};

/** PUT {changes: [{category, audience, level}]} or a single {category, audience, level}. */
export async function PUT(req: Request) {
  return withUser(async user => {
    const body = await readJson<Partial<Change> & {changes?: Change[]}>(req);
    const changes = body?.changes ?? (body?.category ? [body as Change] : []);
    if (!changes.length) return badRequest('No changes');
    for (const c of changes) {
      if (!CATEGORIES.includes(c.category) || !AUDIENCES.includes(c.audience) || !LEVELS.includes(c.level)) return badRequest('Bad policy');
      if (c.audience === 'only_me' && c.level !== 'exact' && c.level !== 'none') return badRequest('only_me is exact or not imported');
    }
    for (const c of changes) await setPolicy(user.id, c.category, c.audience, c.level);
    clearAskCache(user.id);
    return NextResponse.json({policies: await getPolicies(user.id)});
  });
}
