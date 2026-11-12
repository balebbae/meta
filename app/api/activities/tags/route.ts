import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {sql} from '@/lib/db';
import {deleteTag, listTags, TAG_KINDS, TAG_VISIBILITIES, upsertTag} from '@/lib/activities/tags';
import {ACTIVITY_TAGS, GOAL_TAGS, STYLE_TAGS, type TagKind, type TagVisibility} from '@/lib/activities/types';

export async function GET() {
  return withUser(async user => NextResponse.json({tags: await listTags(user.id)}));
}

function inferKind(tag: string): TagKind {
  return GOAL_TAGS.includes(tag) ? 'goal' : STYLE_TAGS.includes(tag) ? 'style' : ACTIVITY_TAGS.includes(tag) ? 'activity' : 'activity';
}

/** POST {tag, kind?, origin?, visibility?, reason?, confirmed?} — adds/confirms a tag (onboarding + interest suggestions §9). */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<{tag?: string; kind?: TagKind; origin?: string; visibility?: TagVisibility; confirmed?: boolean; reason?: string}>(req);
    const tag = body?.tag?.trim().slice(0, 40);
    if (!tag) return badRequest('tag is required');
    const kind = body?.kind && TAG_KINDS.includes(body.kind) ? body.kind : inferKind(tag);
    if (body?.visibility && !TAG_VISIBILITIES.includes(body.visibility)) return badRequest('bad visibility');
    const saved = await upsertTag(user.id, {tag, kind, visibility: body?.visibility, confirmed: body?.confirmed ?? true, origin: body?.origin === 'suggested' ? 'suggested' : 'selected', reason: body?.reason ?? null});
    return NextResponse.json({ok: true, tag: saved});
  });
}

/** DELETE {tag, kind?} (or ?tag=&kind=) — "Not interested" / remove a tag. Without kind, removes the tag in every group. */
export async function DELETE(req: Request) {
  return withUser(async user => {
    const url = new URL(req.url);
    const body = (await readJson<{tag?: string; kind?: TagKind}>(req)) ?? {};
    const tag = (body.tag ?? url.searchParams.get('tag') ?? '').trim();
    const kind = (body.kind ?? url.searchParams.get('kind')) as TagKind | null;
    if (!tag) return badRequest('tag is required');
    if (kind) await deleteTag(user.id, kind, tag);
    else await sql`delete from user_tags where user_id = ${user.id} and tag = ${tag}`;
    return NextResponse.json({ok: true});
  });
}
