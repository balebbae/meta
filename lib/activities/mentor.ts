import {sql} from '@/lib/db';
import {museContext} from '@/lib/activities/answers';
import {QUESTION_CATEGORY, type Category, type QuestionType} from '@/lib/activities/types';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {getUserTags, matchMentors} from '@/lib/activities/discover';

export type MentorConsent = {workouts?: boolean; steps?: boolean; heart?: boolean; sleep?: boolean; offerText?: string; reviewBeforeSend?: boolean; anonymous?: boolean};
export type Turn = {role: 'seeker' | 'mentor'; text: string; at: string};
export type Plan = {title: string; weeks: number; steps: string[]; note: string};
export type MentorRequestView = {
  id: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'revoked';
  role: 'seeker' | 'mentor';
  seeker: {id: number; name: string; avatarUrl: string};
  /** Hidden (null) from the seeker until the mentor accepts and is not anonymous. */
  mentor: {id: number; name: string; avatarUrl: string} | null;
  offer: {metric: string; fromValue: string; toValue: string; weeks: number; anonymous: boolean};
  consent: MentorConsent;
  transcript: Turn[];
  plan: Plan | null;
  museOffline: boolean | null;
  createdAt: string;
};

const CONSENT_CATEGORIES: Category[] = ['workouts', 'steps', 'heart', 'sleep'];

export async function upsertOffer(userId: number, o: {metric: string; fromValue: string; toValue: string; weeks: number; anonymous: boolean; consent: MentorConsent}) {
  await sql`insert into mentor_offers (user_id, metric, from_value, to_value, weeks, consent, anonymous)
    values (${userId}, ${o.metric}, ${o.fromValue}, ${o.toValue}, ${o.weeks}, ${JSON.stringify(o.consent)}::jsonb, ${o.anonymous})
    on conflict (user_id) do update set metric = excluded.metric, from_value = excluded.from_value, to_value = excluded.to_value, weeks = excluded.weeks, consent = excluded.consent, anonymous = excluded.anonymous`;
}

export async function getOffer(userId: number) {
  const [o] = await sql`select metric, from_value, to_value, weeks, consent, anonymous from mentor_offers where user_id = ${userId}`;
  return o ? {metric: o.metric as string, fromValue: (o.from_value as string) ?? '', toValue: (o.to_value as string) ?? '', weeks: Number(o.weeks ?? 0), consent: (o.consent as MentorConsent) ?? {}, anonymous: !!o.anonymous} : null;
}

export async function deleteOffer(userId: number) {
  await sql`delete from mentor_offers where user_id = ${userId}`;
}

export async function isAdult(userId: number): Promise<boolean> {
  const [d] = await sql`select birthday from user_details where user_id = ${userId}`;
  if (!d?.birthday) return true;
  const b = new Date(d.birthday as string);
  return Number.isNaN(b.getTime()) || Date.now() - b.getTime() >= 18 * 365.25 * 86_400_000;
}

export async function createRequest(seekerId: number, mentorId: number): Promise<{id: number} | {error: string}> {
  if (seekerId === mentorId) return {error: 'You cannot mentor yourself'};
  const offer = await getOffer(mentorId);
  if (!offer) return {error: 'That mentor is no longer in the pool'};
  if (!(await isAdult(seekerId)) || !(await isAdult(mentorId))) return {error: 'Mentor match is 18+ only'};
  const [existing] = await sql`select id from mentor_requests where seeker_id = ${seekerId} and mentor_id = ${mentorId} and status in ('pending', 'accepted', 'completed') order by id desc limit 1`;
  if (existing) return {id: existing.id as number};
  const [row] = await sql`insert into mentor_requests (seeker_id, mentor_id, status, consent) values (${seekerId}, ${mentorId}, 'pending', ${JSON.stringify(offer.consent)}::jsonb) returning id`;
  return {id: row.id as number};
}

export async function listRequests(userId: number): Promise<MentorRequestView[]> {
  const rows = await sql`select id from mentor_requests where seeker_id = ${userId} or mentor_id = ${userId} order by id desc limit 20`;
  const out: MentorRequestView[] = [];
  for (const r of rows) {
    const v = await getRequest(r.id as number, userId);
    if (v) out.push(v);
  }
  return out;
}

export async function getRequest(id: number, viewerId: number): Promise<MentorRequestView | null> {
  const [r] = await sql`
    select r.*, s.name as seeker_name, s.avatar_url as seeker_avatar, m.name as mentor_name, m.avatar_url as mentor_avatar,
           o.metric, o.from_value, o.to_value, o.weeks, o.anonymous as offer_anonymous
    from mentor_requests r join users s on s.id = r.seeker_id join users m on m.id = r.mentor_id
    left join mentor_offers o on o.user_id = r.mentor_id where r.id = ${id}`;
  if (!r) return null;
  if (r.seeker_id !== viewerId && r.mentor_id !== viewerId) return null;
  const role = r.seeker_id === viewerId ? 'seeker' : 'mentor';
  const consent = (r.consent as MentorConsent) ?? {};
  const anonymous = consent.anonymous != null ? !!consent.anonymous : !!r.offer_anonymous;
  const revealed = role === 'mentor' || (['accepted', 'completed'].includes(r.status as string) && !anonymous);
  const plan = (r.plan as (Plan & {museOffline?: boolean}) | null) ?? null;
  return {
    id: r.id as number,
    status: r.status as MentorRequestView['status'],
    role,
    seeker: {id: r.seeker_id as number, name: r.seeker_name as string, avatarUrl: r.seeker_avatar as string},
    mentor: revealed ? {id: r.mentor_id as number, name: r.mentor_name as string, avatarUrl: r.mentor_avatar as string} : null,
    offer: {metric: (r.metric as string) ?? 'progress', fromValue: (r.from_value as string) ?? '', toValue: (r.to_value as string) ?? '', weeks: Number(r.weeks ?? 0), anonymous},
    consent: revealed ? consent : {anonymous},
    transcript: (r.transcript as Turn[]) ?? [],
    plan: plan ? {title: plan.title, weeks: plan.weeks, steps: plan.steps, note: plan.note} : null,
    museOffline: plan?.museOffline ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function decide(id: number, mentorId: number, body: {accept: boolean; consent?: MentorConsent; anonymous?: boolean}) {
  const [r] = await sql`select consent from mentor_requests where id = ${id} and mentor_id = ${mentorId} and status = 'pending'`;
  if (!r) return false;
  const consent = {...((r.consent as MentorConsent) ?? {}), ...(body.consent ?? {}), anonymous: body.anonymous ?? (r.consent as MentorConsent)?.anonymous ?? true};
  await sql`update mentor_requests set status = ${body.accept ? 'accepted' : 'declined'}, consent = ${JSON.stringify(consent)}::jsonb, updated_at = now() where id = ${id}`;
  return true;
}

/** Either side can revoke; both keep the transcript (§11). */
export async function revoke(id: number, userId: number) {
  const res = await sql`update mentor_requests set status = 'revoked', updated_at = now() where id = ${id} and (seeker_id = ${userId} or mentor_id = ${userId}) and status <> 'revoked' returning id`;
  return res.length > 0;
}

/** The ONLY mentor data the exchange may use: museContext(mentorId) filtered by the mentor's consent toggles + their offer text. */
async function mentorFacts(mentorId: number, consent: MentorConsent): Promise<Record<string, string | number | boolean | null>> {
  const ctx = await museContext(mentorId);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [q, v] of Object.entries(ctx)) {
    const cat = QUESTION_CATEGORY[q as QuestionType];
    if (cat === 'body' || cat === 'location') continue;
    if (CONSENT_CATEGORIES.includes(cat) && consent[cat as keyof MentorConsent] === true) out[q] = v;
  }
  return out;
}

function scriptedExchange(offer: MentorRequestView['offer'], seekerTags: string[], consent: MentorConsent): {turns: Turn[]; plan: Plan} {
  const now = () => new Date().toISOString();
  const goal = seekerTags.find(t => /^(Get|Be|Train|Do|Lose|Sleep)/.test(t)) ?? 'make progress';
  const text = consent.offerText?.trim() || `I kept it simple and showed up every week.`;
  const turns: Turn[] = [
    {role: 'seeker', text: `My friend wants to ${goal.toLowerCase()}. You went from ${offer.fromValue} to ${offer.toValue} on ${offer.metric.toLowerCase()} in ${offer.weeks} weeks. What did a normal week look like?`, at: now()},
    {role: 'mentor', text: `${text} Most weeks were ordinary; the trick was not skipping two in a row.`, at: now()},
    {role: 'seeker', text: `What got in the way, and how did you keep going when a week went badly?`, at: now()},
    {role: 'mentor', text: `Busy weeks and travel. I planned a shorter “minimum” session so a bad week still counted, and I told a friend my plan so someone noticed.`, at: now()},
    {role: 'seeker', text: `If my friend had ${offer.weeks} weeks starting Monday, what are the first three things to do?`, at: now()},
    {role: 'mentor', text: `Pick two fixed days and put them on the calendar, decide the first-week version so it feels easy, and set up a Turf or Rally game with friends so it stays social.`, at: now()},
  ];
  const plan: Plan = {
    title: `${offer.weeks}-week plan: ${offer.metric}`,
    weeks: offer.weeks || 8,
    steps: ['Weeks 1–2: two short sessions a week, same days every week.', `Weeks 3–${Math.max(4, Math.floor((offer.weeks || 8) / 2))}: add a third session; keep one of them with a friend.`, 'Second half: one harder session a week, everything else stays easy.', 'Every Sunday: check in with your Muse and adjust the week ahead.'],
    note: 'Scripted from the mentor’s offer (Muse offline).',
  };
  return {turns, plan};
}

export type ExchangeEvent = {type: 'typing'; who: 'seeker' | 'mentor'} | {type: 'turn'; turn: Turn} | {type: 'plan'; plan: Plan; museOffline: boolean} | {type: 'done'} | {type: 'error'; message: string};

/**
 * Seeker's Muse (Ember minimal) asks 3 questions; the mentor's Muse (Spark minimal) answers from consented facts + offer text;
 * Spark then writes a plan. Persists transcript + plan. Scripted fallback when Muse is offline.
 */
export async function* runExchange(id: number, viewerId: number): AsyncGenerator<ExchangeEvent> {
  const view = await getRequest(id, viewerId);
  if (!view) return yield {type: 'error', message: 'Not found'};
  if (view.status !== 'accepted') return yield {type: 'error', message: `Request is ${view.status}`};
  const [row] = await sql`select seeker_id, mentor_id from mentor_requests where id = ${id}`;
  const seekerTags = await getUserTags(row.seeker_id as number);
  const turns: Turn[] = [];
  const save = async (plan?: Plan & {museOffline: boolean}) =>
    sql`update mentor_requests set transcript = ${JSON.stringify(turns)}::jsonb, plan = ${plan ? JSON.stringify(plan) : null}::jsonb, status = ${plan ? 'completed' : 'accepted'}, updated_at = now() where id = ${id}`;
  const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

  if (!museConfigured()) {
    const {turns: scripted, plan} = scriptedExchange(view.offer, seekerTags, view.consent);
    for (const t of scripted) {
      yield {type: 'typing', who: t.role};
      await pause(t.role === 'seeker' ? 1400 : 2200);
      turns.push({...t, at: new Date().toISOString()});
      yield {type: 'turn', turn: turns[turns.length - 1]};
      await save();
    }
    yield {type: 'typing', who: 'mentor'};
    await pause(1800);
    await save({...plan, museOffline: true});
    yield {type: 'plan', plan, museOffline: true};
    return yield {type: 'done'};
  }

  const facts = await mentorFacts(row.mentor_id as number, view.consent);
  const offerLine = `${view.offer.metric}: ${view.offer.fromValue} → ${view.offer.toValue} in ${view.offer.weeks} weeks. Mentor's note: ${view.consent.offerText ?? ''}`;
  const rules = 'Rules: warm, specific, under 45 words. Never mention bodies, weight, calories, heart rate numbers, sleep numbers or health. Never reveal the mentor\'s name or location.';
  const qSchema = {type: 'object', properties: {text: {type: 'string'}}, required: ['text'], additionalProperties: false};
  try {
    for (let i = 0; i < 3; i++) {
      yield {type: 'typing', who: 'seeker'};
      const q = await museJson<{text: string}>({model: MODELS.ember, effort: 'minimal', schemaName: 'mentor_question', schema: qSchema, input: `You are the seeker's Muse asking an anonymous mentor's Muse question ${i + 1} of 3 on behalf of a friend whose tags are ${seekerTags.join(', ') || 'none'}. Mentor record: ${offerLine}. Previous turns: ${JSON.stringify(turns.map(t => t.text))}. Ask one concrete question about how they did it. ${rules}`});
      turns.push({role: 'seeker', text: q.text.trim(), at: new Date().toISOString()});
      yield {type: 'turn', turn: turns[turns.length - 1]};
      await save();
      yield {type: 'typing', who: 'mentor'};
      const a = await museJson<{text: string}>({model: MODELS.spark, effort: 'minimal', schemaName: 'mentor_answer', schema: qSchema, input: `You are the mentor's Muse. Answer the question using ONLY these consented facts (rounded) ${JSON.stringify(facts)} and the mentor's record: ${offerLine}. If the facts don't cover it, speak from the record only. Question: ${turns[turns.length - 1].text}. ${rules}`});
      turns.push({role: 'mentor', text: a.text.trim(), at: new Date().toISOString()});
      yield {type: 'turn', turn: turns[turns.length - 1]};
      await save();
    }
    yield {type: 'typing', who: 'mentor'};
    const plan = await museJson<Plan>({model: MODELS.spark, effort: 'minimal', schemaName: 'mentor_plan', schema: {type: 'object', properties: {title: {type: 'string'}, weeks: {type: 'integer'}, steps: {type: 'array', items: {type: 'string'}}, note: {type: 'string'}}, required: ['title', 'weeks', 'steps', 'note'], additionalProperties: false}, input: `Write a ${view.offer.weeks || 8}-week plan card (3-5 steps) for the seeker based on this exchange: ${JSON.stringify(turns)}. Mentor record: ${offerLine}. ${rules} note = one encouraging sentence.`});
    await save({...plan, museOffline: false});
    yield {type: 'plan', plan, museOffline: false};
    yield {type: 'done'};
  } catch (e) {
    const {turns: scripted, plan} = scriptedExchange(view.offer, seekerTags, view.consent);
    for (const t of scripted.slice(turns.length)) {
      turns.push({...t, at: new Date().toISOString()});
      yield {type: 'turn', turn: turns[turns.length - 1]};
    }
    await save({...plan, museOffline: true});
    yield {type: 'plan', plan, museOffline: true};
    yield {type: 'done'};
    void e;
  }
}

export {matchMentors};
