import {sql} from '@/lib/db';
import {ask} from '@/lib/activities/answers';
import {friendsOf, getUserTags} from '@/lib/activities/discover';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';

/**
 * §19 weekly recap feed post. Owner facts come from ask(ownerId, 'only_me', ...) (so the owner's own policy still applies to the post text);
 * other people are named only when they share with friends (ask(friend, 'friends', ...) not withheld).
 */
export async function buildRecap(userId: number): Promise<{content: string; museOffline: boolean; facts: Record<string, unknown>}> {
  const asker = `recap:${userId}`;
  const [workouts, days, distance, tags, friends] = await Promise.all([ask(userId, 'only_me', 'workouts_this_week', asker), ask(userId, 'only_me', 'active_days_this_week', asker), ask(userId, 'only_me', 'distance_this_week_km', asker), getUserTags(userId), friendsOf(userId)]);
  const friendNames: string[] = [];
  for (const f of friends.slice(0, 15)) {
    const a = await ask(f.id, 'friends', 'workouts_this_week', asker);
    if (!a.withheld && (a.value === true || (typeof a.value === 'number' && a.value > 0))) friendNames.push(f.name.split(' ')[0]);
    if (friendNames.length >= 3) break;
  }
  const [quests] = await sql`select count(*)::int as n from quest_moves qm join quests q on q.id = qm.quest_id where qm.user_id = ${userId} and qm.created_at > now() - interval '7 days'`.catch(() => [{n: 0}]);
  const facts = {workouts: workouts.value, activeDays: days.value, distanceKm: distance.value, questMoves: Number(quests?.n ?? 0), friendsActive: friendNames, tags};
  const w = Number(workouts.value ?? 0);
  const d = Number(days.value ?? 0);
  const km = typeof distance.value === 'number' ? distance.value : 0;
  const parts = [w > 0 ? `${w} ${w === 1 ? 'workout' : 'workouts'} across ${d} ${d === 1 ? 'day' : 'days'}` : 'a rest week', km > 0 ? `${km} km covered` : null, facts.questMoves > 0 ? `${facts.questMoves} Rally ${facts.questMoves === 1 ? 'move' : 'moves'}` : null].filter(Boolean);
  const fallback = `Weekly recap: ${parts.join(', ')}.${friendNames.length ? ` ${friendNames.join(', ')} ${friendNames.length === 1 ? 'was' : 'were'} out there too.` : ''} Next week: ${tags.includes('Train for an event') ? 'one long session with friends.' : 'keep the streak going.'} #Activities`;
  if (!museConfigured()) return {content: fallback, museOffline: true, facts};
  try {
    const out = await museJson<{post: string}>({model: MODELS.ember, effort: 'low', schemaName: 'weekly_recap', schema: {type: 'object', properties: {post: {type: 'string'}}, required: ['post'], additionalProperties: false}, input: `Write a 2-3 sentence first-person Facebook post recapping this week's activity. Facts: ${JSON.stringify(facts)}. Only name the friends listed in friendsActive. Never mention bodies, weight, health, heart rate or sleep. Warm, not boastful. End with #Activities.`});
    return {content: out.post?.trim() || fallback, museOffline: false, facts};
  } catch {
    return {content: fallback, museOffline: true, facts};
  }
}

export async function postRecap(userId: number): Promise<{postId: number; content: string; museOffline: boolean}> {
  const recap = await buildRecap(userId);
  const [row] = await sql`insert into posts (author_id, content, audience) values (${userId}, ${recap.content}, 'friends') returning id`;
  return {postId: row.id as number, content: recap.content, museOffline: recap.museOffline};
}
