import {sql} from '@/lib/db';
import type {TagKind, TagOrigin, TagVisibility, UserTag} from '@/lib/activities/types';

/** §4 step 1: activity/goal/style default to friends; anything health-related stays with the Muse. */
export function defaultVisibility(kind: TagKind): TagVisibility {
  return kind === 'constraint' ? 'muse_only' : 'friends';
}

export const TAG_KINDS: TagKind[] = ['activity', 'goal', 'style', 'constraint'];
export const TAG_VISIBILITIES: TagVisibility[] = ['public', 'friends', 'only_me', 'muse_only'];

function mapTag(r: Record<string, unknown>): UserTag {
  return {
    tag: String(r.tag),
    kind: r.kind as TagKind,
    origin: r.origin as TagOrigin,
    visibility: r.visibility as TagVisibility,
    confirmed: Boolean(r.confirmed),
    reason: (r.reason as string | null) ?? null,
  };
}

/** Owner view: every tag including muse_only. */
export async function listTags(userId: number): Promise<UserTag[]> {
  const rows = await sql`select tag, kind, origin, visibility, confirmed, reason from user_tags where user_id = ${userId} order by kind, created_at`;
  return rows.map(mapTag);
}

export async function upsertTag(userId: number, t: {tag: string; kind: TagKind; origin?: TagOrigin; visibility?: TagVisibility; confirmed?: boolean; reason?: string | null}): Promise<UserTag> {
  const tag = t.tag.trim().slice(0, 40);
  const [row] = await sql`
    insert into user_tags (user_id, tag, kind, origin, visibility, confirmed, reason)
    values (${userId}, ${tag}, ${t.kind}, ${t.origin ?? 'selected'}, ${t.visibility ?? defaultVisibility(t.kind)}, ${t.confirmed ?? true}, ${t.reason ?? null})
    on conflict (user_id, kind, tag) do update set visibility = excluded.visibility, confirmed = excluded.confirmed, origin = excluded.origin, reason = excluded.reason
    returning tag, kind, origin, visibility, confirmed, reason`;
  return mapTag(row);
}

export async function deleteTag(userId: number, kind: TagKind, tag: string): Promise<void> {
  await sql`delete from user_tags where user_id = ${userId} and kind = ${kind} and tag = ${tag}`;
}

/** Replace the user's selected tags of the given kinds in one go (chip picker save). */
export async function replaceSelectedTags(userId: number, tags: {tag: string; kind: TagKind; visibility?: TagVisibility}[], kinds: TagKind[]): Promise<void> {
  for (const k of kinds) await sql`delete from user_tags where user_id = ${userId} and kind = ${k} and origin = 'selected'`;
  for (const t of tags) if (kinds.includes(t.kind) && t.tag.trim()) await upsertTag(userId, {...t, origin: 'selected'});
}
