import {sql} from '@/lib/db';
import {AUDIENCES, CATEGORIES, type Audience, type Category, type ShareLevel} from '@/lib/activities/types';

/** Conservative defaults from §7.1. Location is handled per Turf game (§7.4) and defaults to none. */
export const DEFAULT_POLICIES: Record<Category, Record<Audience, ShareLevel>> = {
  workouts: {only_me: 'exact', game_participants: 'rounded', friends: 'boolean', mentor_match: 'rounded', public: 'none'},
  steps: {only_me: 'exact', game_participants: 'rounded', friends: 'boolean', mentor_match: 'rounded', public: 'none'},
  heart: {only_me: 'exact', game_participants: 'muse_only', friends: 'muse_only', mentor_match: 'muse_only', public: 'none'},
  sleep: {only_me: 'exact', game_participants: 'muse_only', friends: 'muse_only', mentor_match: 'muse_only', public: 'none'},
  body: {only_me: 'exact', game_participants: 'muse_only', friends: 'none', mentor_match: 'none', public: 'none'},
  location: {only_me: 'exact', game_participants: 'none', friends: 'none', mentor_match: 'none', public: 'none'},
};

export type PolicyMatrix = Record<Category, Record<Audience, ShareLevel>>;

export async function getPolicies(userId: number): Promise<PolicyMatrix> {
  const matrix: PolicyMatrix = JSON.parse(JSON.stringify(DEFAULT_POLICIES));
  const rows = await sql`select category, audience, level from share_policies where user_id = ${userId}`;
  for (const r of rows) {
    const c = r.category as Category;
    const a = r.audience as Audience;
    if (CATEGORIES.includes(c) && AUDIENCES.includes(a)) matrix[c][a] = r.level as ShareLevel;
  }
  return matrix;
}

export async function setPolicy(userId: number, category: Category, audience: Audience, level: ShareLevel): Promise<void> {
  await sql`
    insert into share_policies (user_id, category, audience, level) values (${userId}, ${category}, ${audience}, ${level})
    on conflict (user_id, category, audience) do update set level = excluded.level, updated_at = now()`;
}

export function effectiveLevel(matrix: PolicyMatrix, category: Category, audience: Audience): ShareLevel {
  return matrix[category]?.[audience] ?? 'none';
}
