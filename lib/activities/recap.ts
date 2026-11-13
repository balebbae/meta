import {sql} from '@/lib/db';
import {ask} from '@/lib/activities/answers';
import type {Answer} from '@/lib/activities/types';
import {friendsOf, getUserTags} from '@/lib/activities/discover';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';

/**
 * §19 weekly recap feed post. The post is a 'friends' post, so the owner's own facts are asked at the 'friends' audience and
 * rendered through the same rounding/yes-no rules friends would get from their Muse; exact vault numbers never reach the post.
 * Other people are named only when they share with friends (ask(friend, 'friends', ...) not withheld).
 */
export async function buildRecap(userId: number): Promise<{content: string; museOffline: boolean; facts: Record<string, unknown>}> {
  const asker = `recap:${userId}`;
  const [workouts, days, distance, tags, friends] = await Promise.all([ask(userId, 'friends', 'workouts_this_week', asker), ask(userId, 'friends', 'active_days_this_week', asker), ask(userId, 'friends', 'distance_this_week_km', asker), getUserTags(userId), friendsOf(userId)]);
  const friendNames: string[] = [];
  for (const f of friends.slice(0, 15)) {
    const a = await ask(f.id, 'friends', 'workouts_this_week', asker);
    if (!a.withheld && (a.value === true || (typeof a.value === 'number' && a.value > 0))) friendNames.push(f.name.split(' ')[0]);
    if (friendNames.length >= 3) break;
  }
  const [quests] = await sql`select count(*)::int as n from quest_moves qm join quests q on q.id = qm.quest_id where qm.user_id = ${userId} and qm.created_at > now() - interval '7 days'`.catch(() => [{n: 0}]);
  const questMoves = Number(quests?.n ?? 0);
  // Friend-facing phrasing: a boolean answer becomes yes/no text, a rounded number becomes a band, withheld facts are dropped.
  const workoutText = shareText(workouts, n => `${n} ${n === 1 ? 'workout' : 'workouts'}`, 'moved this week');
  const daysText = shareText(days, n => `${n} active ${n === 1 ? 'day' : 'days'}`, 'got out on a few days');
  const distanceText = shareText(distance, n => `around ${n} km`, 'covered some ground');
  const moved = workouts.value === true || (typeof workouts.value === 'number' && workouts.value > 0);
  const facts = {workouts: workoutText, activeDays: daysText, distance: distanceText, questMoves: questMoves > 0 ? (questMoves >= 10 ? 'lots of Rally moves' : 'a few Rally moves') : null, friendsActive: friendNames, tags};
  const parts = [moved ? [workoutText, daysText].filter(Boolean).join(' across ') || 'moved this week' : 'a rest week', moved ? distanceText : null, facts.questMoves].filter(Boolean);
  const fallback = `Weekly recap: ${parts.join(', ')}.${friendNames.length ? ` ${friendNames.join(', ')} ${friendNames.length === 1 ? 'was' : 'were'} out there too.` : ''} Next week: ${tags.includes('Train for an event') ? 'one long session with friends.' : 'keep the streak going.'} #Activities`;
  if (!museConfigured()) return {content: fallback, museOffline: true, facts};
  try {
    const out = await museJson<{post: string}>({model: MODELS.ember, effort: 'low', schemaName: 'weekly_recap', schema: {type: 'object', properties: {post: {type: 'string'}}, required: ['post'], additionalProperties: false}, input: `Write a 2-3 sentence first-person Facebook post recapping this week's activity. Facts (already rounded for friends; repeat them as written and never invent exact numbers, distances, times or counts): ${JSON.stringify(facts)}. Only name the friends listed in friendsActive. Never mention bodies, weight, health, heart rate or sleep. Warm, not boastful. End with #Activities.`});
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

/** Turns a friend-level Answer into post text: numbers are already rounded by `ask`, booleans become the yes phrase, withheld/no answers vanish. */
function shareText(a: Answer, numberText: (n: number) => string, yesText: string): string | null {
  if (a.withheld || a.value == null || a.value === false) return null;
  if (a.value === true) return yesText;
  if (typeof a.value === 'number') return a.value > 0 ? numberText(a.value) : null;
  return String(a.value);
}
