import {NextResponse, type NextRequest} from 'next/server';
import {sql} from '@/lib/db';
import {badRequest, readJson, withUser} from '@/lib/api';
import {ACTIVITY_TAGS, GOAL_TAGS, STYLE_TAGS} from '@/lib/activities/types';

export async function GET() {
  return withUser(async user => {
    const rows = await sql`select tag, kind, origin, visibility, confirmed, reason from user_tags where user_id = ${user.id} order by kind, tag`;
    return NextResponse.json({tags: rows});
  });
}

/** POST {tag, kind?, origin?, reason?} — adds/confirms a tag (used by interest suggestions). */
export async function POST(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{tag?: string; kind?: string; origin?: string; reason?: string}>(req);
    const tag = body?.tag?.trim();
    if (!tag) return badRequest('tag is required');
    const kind = body?.kind ?? (GOAL_TAGS.includes(tag) ? 'goal' : STYLE_TAGS.includes(tag) ? 'style' : ACTIVITY_TAGS.includes(tag) ? 'activity' : 'activity');
    const origin = body?.origin === 'suggested' ? 'suggested' : 'selected';
    await sql`insert into user_tags (user_id, tag, kind, origin, visibility, confirmed, reason) values (${user.id}, ${tag}, ${kind}, ${origin}, 'friends', true, ${body?.reason ?? null})
      on conflict (user_id, kind, tag) do update set confirmed = true, origin = excluded.origin, reason = coalesce(excluded.reason, user_tags.reason)`;
    return NextResponse.json({ok: true});
  });
}

/** DELETE {tag} — "Not interested" removes the tag (§9). */
export async function DELETE(req: NextRequest) {
  return withUser(async user => {
    const body = await readJson<{tag?: string}>(req);
    const tag = body?.tag?.trim();
    if (!tag) return badRequest('tag is required');
    await sql`delete from user_tags where user_id = ${user.id} and tag = ${tag}`;
    return NextResponse.json({ok: true});
  });
}
