/**
 * Swim journeys: a swimming Reel sent to a chat becomes a shared crossing (route + checkpoints from
 * lib/rally/swim.ts). Each swim moves the boat; a photo of a watch or lap counter is read by Ember
 * (lib/activities/proof.ts), otherwise the distance is typed.
 */
import {sql} from '@/lib/db';
import {analyzeProof} from '@/lib/activities/proof';
import type {SwimCardPayload} from '@/lib/activities/types';
import {addSystemMessage, sendMessage} from '@/lib/messaging-queries';
import type {ReelInfo} from '@/lib/rally/reel-router';
import {clampSwim, crossed, laneBuddyBonus, routeById, routeFor, type SwimRoute} from '@/lib/rally/swim';

const first = (name: string) => name.split(' ')[0];

export async function createSwimJourney(opts: {reel: ReelInfo; conversationId: number; creator: {id: number; name: string}}): Promise<{journeyId: number}> {
  const members = await sql`select u.name from conversation_members cm join users u on u.id = cm.user_id where cm.conversation_id = ${opts.conversationId}`;
  const route = routeFor(members.length);
  const title = 'Castle Crossing';
  const intro = `${route.from} to ${route.to}`;
  const [row] = await sql`
    insert into swim_journeys (conversation_id, reel_id, route, title, total_m, story, created_by, ends_at)
    values (${opts.conversationId}, ${opts.reel.id}, ${route.id}, ${title}, ${route.totalM}, ${intro}, ${opts.creator.id}, now() + interval '30 days')
    returning id`;
  const journeyId = Number(row.id);
  const payload: SwimCardPayload = {journeyId, title, route: route.id, totalM: route.totalM};
  await sendMessage(opts.conversationId, opts.creator, `${first(opts.creator.name)} started ${title}`, null, {kind: 'swim_card', payload});
  return {journeyId};
}

export type SwimState = {
  id: number;
  conversationId: number;
  title: string;
  story: string;
  route: SwimRoute;
  progressM: number;
  status: 'open' | 'done';
  endsAt: string;
  swimmers: {userId: number; name: string; avatarUrl: string; meters: number}[];
  recent: {name: string; meters: number; bonus: number; proof: string; at: string}[];
  mine: number;
};

export async function getSwimState(id: number, viewerId: number): Promise<SwimState | null> {
  const [j] = await sql`select * from swim_journeys where id = ${id}`;
  if (!j) return null;
  const [totals, recent] = await Promise.all([
    sql`select l.user_id, u.name, u.avatar_url, sum(l.meters + l.bonus)::int as meters from swim_logs l join users u on u.id = l.user_id where l.journey_id = ${id} group by l.user_id, u.name, u.avatar_url order by meters desc`,
    sql`select u.name, l.meters, l.bonus, l.proof, l.created_at from swim_logs l join users u on u.id = l.user_id where l.journey_id = ${id} order by l.id desc limit 6`,
  ]);
  return {
    id,
    conversationId: Number(j.conversation_id),
    title: String(j.title),
    story: String(j.story ?? ''),
    route: routeById(String(j.route)),
    progressM: Number(j.progress_m),
    status: j.status as SwimState['status'],
    endsAt: new Date(j.ends_at as string).toISOString(),
    swimmers: totals.map(t => ({userId: Number(t.user_id), name: String(t.name), avatarUrl: String(t.avatar_url), meters: Number(t.meters)})),
    recent: recent.map(r => ({name: first(String(r.name)), meters: Number(r.meters), bonus: Number(r.bonus), proof: String(r.proof), at: new Date(r.created_at as string).toISOString()})),
    mine: Number(totals.find(t => Number(t.user_id) === viewerId)?.meters ?? 0),
  };
}

export type SwimLogResult = {meters: number; bonus: number; progressM: number; totalM: number; checkpoints: string[]; finished: boolean; proof: 'typed' | 'photo'};

export async function logSwim(id: number, user: {id: number; name: string}, input: {meters?: number | null; image?: string | null}): Promise<SwimLogResult | {error: string; status: number}> {
  const [j] = await sql`select * from swim_journeys where id = ${id}`;
  if (!j) return {error: 'Not found', status: 404};
  if (j.status !== 'open') return {error: 'Already crossed', status: 409};
  let meters: number | null = null;
  let proof: 'typed' | 'photo' = 'typed';
  if (input.image) {
    const read = await analyzeProof(input.image);
    const r = read.result;
    if (!r || r.verdict === 'not_a_workout' || !r.distanceKm) return {error: "Couldn't read a distance. Type it instead.", status: 422};
    meters = clampSwim(r.distanceKm * 1000);
    proof = 'photo';
  } else if (input.meters != null) {
    meters = clampSwim(Number(input.meters));
  }
  if (meters == null) return {error: 'At least 25 m.', status: 400};
  const [buddy] = await sql`select 1 from swim_logs where journey_id = ${id} and user_id <> ${user.id} and created_at > now() - interval '1 day' limit 1`;
  const bonus = laneBuddyBonus(meters, Boolean(buddy));
  await sql`insert into swim_logs (journey_id, user_id, meters, bonus, proof) values (${id}, ${user.id}, ${meters}, ${bonus}, ${proof})`;
  // add in the database so two swims logged at once both count
  const [p] = await sql`update swim_journeys set progress_m = least(total_m, progress_m + ${meters + bonus}) where id = ${id} returning progress_m, total_m`;
  const after = Number(p.progress_m);
  const before = after - (meters + bonus);
  const route = routeById(String(j.route));
  const passed = crossed(route, before, after).map(c => c.name);
  const finished = after >= Number(p.total_m);
  const conv = Number(j.conversation_id);
  const pct = Math.round((after / Number(p.total_m)) * 100);
  await addSystemMessage(conv, user, `${first(user.name)} swam ${meters + bonus} m · ${pct}% across`);
  for (const name of passed) await addSystemMessage(conv, user, `📍 ${name}`);
  if (finished) {
    await sql`update swim_journeys set status = 'done' where id = ${id} and status = 'open'`;
    await addSystemMessage(conv, user, '🎉 Castle Crossing done');
  }
  return {meters, bonus, progressM: after, totalM: Number(p.total_m), checkpoints: passed, finished, proof};
}
