import {sql} from '@/lib/db';
import {tagsForText} from '@/lib/activities/discover';

export type InterestSuggestion = {tag: string; reason: string; source: 'reel' | 'group' | 'event'};

/**
 * §3 interest-based suggestions. Opt-in only (activity_profiles.interest_suggestions_enabled).
 * Signals: reels the user played, groups they are in, events they RSVP'd to. Never health or body data.
 */
export async function interestSuggestions(userId: number): Promise<{enabled: boolean; suggestions: InterestSuggestion[]}> {
  const [profile] = await sql`select interest_suggestions_enabled from activity_profiles where user_id = ${userId}`;
  const enabled = !!profile?.interest_suggestions_enabled;
  if (!enabled) return {enabled, suggestions: []};
  const existing = new Set((await sql`select tag from user_tags where user_id = ${userId}`).map(r => (r.tag as string).toLowerCase()));
  const [groups, events, reels] = await Promise.all([
    sql`select g.name from group_members gm join groups g on g.id = gm.group_id where gm.user_id = ${userId}`,
    sql`select e.title from event_rsvps r join events e on e.id = r.event_id where r.user_id = ${userId} and e.starts_at > now() - interval '60 days'`,
    sql`select r.tags, r.caption from reel_plays p join reels r on r.id = p.reel_id where p.user_id = ${userId} order by p.played_at desc limit 30`.catch(() => []),
  ]);
  const out = new Map<string, InterestSuggestion>();
  const add = (tag: string, s: InterestSuggestion) => {
    if (existing.has(tag.toLowerCase()) || out.has(tag)) return;
    out.set(tag, s);
  };
  for (const r of reels) for (const t of ((r.tags as string[]) ?? []).slice(0, 2)) add(cap(t), {tag: cap(t), reason: `You watched "${(r.caption as string) ?? 'a reel'}"`, source: 'reel'});
  for (const g of groups) for (const t of tagsForText(g.name as string)) add(t, {tag: t, reason: `You're in ${g.name}`, source: 'group'});
  for (const e of events) for (const t of tagsForText(e.title as string)) add(t, {tag: t, reason: `You RSVP'd to ${e.title}`, source: 'event'});
  return {enabled, suggestions: [...out.values()].slice(0, 6)};
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function setInterestSuggestions(userId: number, enabled: boolean) {
  await sql`insert into activity_profiles (user_id, interest_suggestions_enabled) values (${userId}, ${enabled})
    on conflict (user_id) do update set interest_suggestions_enabled = excluded.interest_suggestions_enabled, updated_at = now()`;
  if (!enabled) await sql`delete from user_tags where user_id = ${userId} and origin = 'suggested' and confirmed = false`;
}

/** Dismissed suggestions are stored as unconfirmed suggested tags so they don't come back. */
export async function dismissSuggestion(userId: number, tag: string) {
  await sql`insert into user_tags (user_id, tag, kind, origin, visibility, confirmed, reason) values (${userId}, ${tag}, 'activity', 'suggested', 'only_me', false, 'dismissed')
    on conflict (user_id, kind, tag) do update set confirmed = false, origin = 'suggested', reason = 'dismissed'`;
}
