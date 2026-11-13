/**
 * Mirror Yoga / Mirror Dance persistence + Muse. Flow:
 *  1. createMirrorMatch: the card goes into the chat at once; Muse Spark names the poses in the background.
 *  2. The first player to open it reads the Reel's poses on their phone (saveReference, first wins).
 *  3. Guided routine: the target pose for each step is drawn over the camera; when the player matches it the
 *     routine moves on. submitAttempt grades the best pose per step on the server and keeps their best.
 *  4. When everyone has a score or 24 h pass, the highest score wins.
 * Videos never leave the phone; only joint angles and points do.
 */
import {after} from 'next/server';
import {sql} from '@/lib/db';
import type {MirrorCardPayload} from '@/lib/activities/types';
import {addSystemMessage, sendMessage} from '@/lib/messaging-queries';
import {MODELS, museConfigured, museJson} from '@/lib/muse/client';
import {gradeRoutine, mirrorTitle, targetFor, type AngleFrame, type MirrorMode, type Reference, type Target} from '@/lib/rally/mirror';
import type {ReelInfo} from '@/lib/rally/reel-router';
import {warmClip} from '@/lib/rally/reel-video';

export type MirrorStep = {name: string; cue: string; start: number; end: number};
export type MirrorState = {
  id: number;
  conversationId: number;
  reelId: number;
  mode: 'dance' | 'yoga';
  title: string;
  clipStart: number;
  clipEnd: number;
  steps: MirrorStep[] | null;
  /** Target pose per step (null = nobody clearly visible then); null until the Reel has been read. */
  targets: (Target | null)[] | null;
  needsReference: boolean;
  /** The Reel was read and nobody is clearly visible in it: this match can't be played. */
  unreadable: boolean;
  status: 'open' | 'done';
  winnerId: number | null;
  museUsed: boolean;
  endsAt: string;
  members: number;
  scores: {userId: number; name: string; avatarUrl: string; score: number}[];
  mine: {score: number; note: string | null; stepScores: number[]} | null;
};

const MAX_CLIP_S = 16;
const first = (name: string) => name.split(' ')[0];

/** Tutorial without Muse: yoga uses the Reel's own pose list, dance is split into equal parts. */
export function fallbackSteps(mode: 'dance' | 'yoga', reel: Pick<ReelInfo, 'exercises'>, clipEnd: number): MirrorStep[] {
  const poses = reel.exercises.filter(e => e.name);
  const n = mode === 'yoga' && poses.length ? Math.min(5, poses.length) : 4;
  const len = clipEnd / n;
  return Array.from({length: n}, (_, i) => ({
    name: mode === 'yoga' && poses[i] ? poses[i].name : `Move ${i + 1}`,
    cue: mode === 'yoga' ? 'Ease in, breathe, hold still.' : 'Match the arms, then the legs.',
    start: Math.round(i * len * 10) / 10,
    end: Math.round((i + 1) * len * 10) / 10,
  }));
}

/** Muse's steps must sit inside the clip, in order, each at least a second long. */
export function cleanSteps(raw: MirrorStep[] | undefined, clipEnd: number): MirrorStep[] | null {
  const steps = (raw ?? [])
    .filter(s => s && s.name && Number.isFinite(s.start) && Number.isFinite(s.end))
    .map(s => ({name: String(s.name).slice(0, 28), cue: String(s.cue ?? '').slice(0, 80), start: Math.max(0, Math.min(clipEnd - 1, s.start)), end: Math.max(0, Math.min(clipEnd, s.end))}))
    .filter(s => s.end - s.start >= 1)
    .sort((a, b) => a.start - b.start)
    .slice(0, 5);
  return steps.length >= 2 ? steps : null;
}

const STEP_SCHEMA = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: {type: 'object', properties: {name: {type: 'string'}, cue: {type: 'string'}, start: {type: 'number'}, end: {type: 'number'}}, required: ['name', 'cue', 'start', 'end'], additionalProperties: false},
    },
  },
  required: ['steps'],
  additionalProperties: false,
};

const SPARK_WAIT_MS = 8_000;

/**
 * Spark names the poses. The match already has fallback steps, so players never wait on this; it runs after the
 * response, gives up after 8 s, and only replaces the steps while nobody has played yet.
 */
async function buildTutorial(matchId: number, reel: ReelInfo, mode: 'dance' | 'yoga', clipEnd: number) {
  if (!museConfigured()) return;
  // same number of steps as the fallback, so a routine already in progress still has one pose per step
  const n = fallbackSteps(mode, reel, clipEnd).length;
  {
    try {
      const out = await withTimeout(museJson<{steps: MirrorStep[]}>({
        model: MODELS.spark,
        schemaName: 'mirror_poses',
        schema: STEP_SCHEMA,
        effort: 'minimal',
        input: `Split this ${mode} Reel (0-${clipEnd} s) into exactly ${n} key poses a friend will copy one at a time.
Caption: "${reel.caption.slice(0, 200)}". ${reel.exercises.length ? `Known poses: ${reel.exercises.map(e => e.name).join(', ')}.` : ''}
Each: name (max 3 words), cue (max 8 words, one body instruction), start/end seconds (2-6 s, in order).
Plain words. No emoji, no hype. Never mention bodies or ability.`,
      }), SPARK_WAIT_MS);
      const clean = cleanSteps(out.steps, clipEnd);
      if (clean?.length === n)
        await sql`update mirror_matches set steps = ${JSON.stringify(clean)}::jsonb, muse_used = true
          where id = ${matchId} and not exists (select 1 from mirror_attempts where match_id = ${matchId})`;
    } catch (err) {
      console.error('[mirror] Spark poses failed, keeping fallback', err instanceof Error ? err.message : err);
    }
  }
}

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))]);

export async function createMirrorMatch(opts: {reel: ReelInfo; conversationId: number; creator: {id: number; name: string}; mode: MirrorMode}): Promise<{matchId: number}> {
  const title = mirrorTitle(opts.mode);
  const clipEnd = Math.max(6, Math.min(MAX_CLIP_S, opts.reel.durationSec ?? MAX_CLIP_S));
  const [row] = await sql`
    insert into mirror_matches (conversation_id, reel_id, mode, title, clip_end, steps, created_by, ends_at)
    values (${opts.conversationId}, ${opts.reel.id}, ${opts.mode}, ${title}, ${clipEnd}, ${JSON.stringify(fallbackSteps(opts.mode, opts.reel, clipEnd))}::jsonb, ${opts.creator.id}, now() + interval '24 hours')
    returning id`;
  const matchId = Number(row.id);
  const payload: MirrorCardPayload = {matchId, title, mode: opts.mode, reelId: opts.reel.id};
  await sendMessage(opts.conversationId, opts.creator, `${first(opts.creator.name)} started ${title}`, null, {kind: 'mirror_card', payload});
  // playable at once with fallback steps; Spark's names and the server's copy of the Reel arrive in the background
  after(() => Promise.all([buildTutorial(matchId, opts.reel, opts.mode, clipEnd), warmClip(opts.reel.videoUrl)]));
  return {matchId};
}


async function finalize(matchId: number) {
  const [m] = await sql`
    update mirror_matches set status = 'done',
      winner_id = (select user_id from mirror_attempts where match_id = ${matchId} order by score desc, created_at asc limit 1)
    where id = ${matchId} and status = 'open' returning conversation_id, winner_id, mode, created_by`;
  if (!m) return;
  const [w] = m.winner_id ? await sql`select u.name, a.score from users u join mirror_attempts a on a.user_id = u.id and a.match_id = ${matchId} where u.id = ${m.winner_id}` : [];
  const title = mirrorTitle(m.mode as MirrorMode);
  const text = w ? `🏆 ${first(String(w.name))} wins ${title} · ${w.score}` : `${title} ended`;
  await addSystemMessage(Number(m.conversation_id), {id: Number(m.winner_id ?? m.created_by)}, text);
}

const targetsOf = (ref: Reference | null, steps: MirrorStep[] | null) => (ref?.points && steps ? steps.map(s => targetFor(ref, s.start, s.end)) : null);

export async function getMirrorState(matchId: number, viewerId: number): Promise<MirrorState | null> {
  // one round trip each, in parallel (the card and the sheet both poll this)
  const [[m], rows] = await Promise.all([
    sql`select m.*, (select count(*)::int from conversation_members x where x.conversation_id = m.conversation_id) as member_count from mirror_matches m where m.id = ${matchId}`,
    sql`
      select a.user_id, a.score, a.note, a.step_scores, u.name, u.avatar_url from mirror_attempts a join users u on u.id = a.user_id
      where a.match_id = ${matchId} order by a.score desc, a.created_at asc`,
  ]);
  if (!m) return null;
  const members = Number(m.member_count ?? 0);
  let status = m.status as MirrorState['status'];
  if (status === 'open' && (new Date(m.ends_at as string).getTime() < Date.now() || (members > 1 && rows.length >= members))) {
    await finalize(matchId);
    status = 'done';
  }
  const mine = rows.find(r => Number(r.user_id) === viewerId);
  const [w] = status === 'done' ? await sql`select winner_id from mirror_matches where id = ${matchId}` : [];
  const raw = (m.reference as (Reference & {unreadable?: boolean; v?: number}) | null) ?? null;
  // only verdicts from the current rules count; older ones are read again
  const unreadable = Boolean(raw?.unreadable) && raw?.v === UNREADABLE_V;
  const ref = unreadable ? null : raw;
  const steps = (m.steps as MirrorStep[] | null) ?? null;
  return {
    id: matchId,
    conversationId: Number(m.conversation_id),
    reelId: Number(m.reel_id),
    mode: m.mode as MirrorState['mode'],
    title: String(m.title),
    clipStart: Number(m.clip_start),
    clipEnd: Number(m.clip_end),
    steps,
    targets: targetsOf(ref, steps),
    needsReference: !unreadable && !ref?.points,
    unreadable,
    status,
    winnerId: w ? ((w.winner_id as number | null) ?? null) : null,
    museUsed: Boolean(m.muse_used),
    endsAt: new Date(m.ends_at as string).toISOString(),
    members,
    scores: rows.map(r => ({userId: Number(r.user_id), name: String(r.name), avatarUrl: String(r.avatar_url), score: Number(r.score)})),
    mine: mine ? {score: Number(mine.score), note: (mine.note as string | null) ?? null, stepScores: (mine.step_scores as number[] | null) ?? []} : null,
  };
}

/** The Reel was read and nobody is in it: remember, so no phone re-reads it and the Reel isn't offered again. */
export async function markUnreadable(matchId: number) {
  await sql`update mirror_matches set reference = ${JSON.stringify({unreadable: true, v: UNREADABLE_V})}::jsonb where id = ${matchId} and (reference is null or reference->'points' is null)`;
}

/** Bumped when the "is someone visible" rules change, so Reels rejected under old rules get another read. */
export const UNREADABLE_V = 2;

export async function matchSteps(matchId: number): Promise<MirrorStep[]> {
  const [m] = await sql`select steps from mirror_matches where id = ${matchId}`;
  return (m?.steps as MirrorStep[] | null) ?? [];
}

/** First complete reference wins (older ones without overlay points get replaced), so nobody swaps the routine mid-game. */
export async function saveReference(matchId: number, ref: Reference): Promise<boolean> {
  const rows = await sql`update mirror_matches set reference = ${JSON.stringify(ref)}::jsonb where id = ${matchId} and (reference is null or reference->'points' is null) returning id`;
  return rows.length > 0;
}

async function scoreNote(score: number, weakest: string | null): Promise<string> {
  const fallback = score >= 85 ? 'Spot on.' : weakest ? `Work on ${weakest}.` : 'Nice. Go again?';
  if (!museConfigured()) return fallback;
  try {
    const out = await museJson<{note: string}>({
      model: MODELS.ember,
      schemaName: 'mirror_note',
      schema: {type: 'object', properties: {note: {type: 'string'}}, required: ['note'], additionalProperties: false},
      effort: 'minimal',
      input: `Max 6 words of coaching for a friend who scored ${score}/100 copying poses. Weakest pose: ${weakest ?? 'none'}. Plain, no emoji, no exclamation marks, never about bodies.`,
    });
    return out.note?.trim().replace(/!+/g, '.').slice(0, 60) || fallback;
  } catch {
    return fallback;
  }
}

export type AttemptResult = {score: number; best: number; note: string; stepScores: number[]};

export async function submitAttempt(matchId: number, user: {id: number; name: string}, poses: AngleFrame[]): Promise<AttemptResult | {error: string; status: number}> {
  const [m] = await sql`select * from mirror_matches where id = ${matchId}`;
  if (!m) return {error: 'Not found', status: 404};
  if (m.status !== 'open' || new Date(m.ends_at as string).getTime() < Date.now()) return {error: 'This match is over', status: 409};
  const steps = (m.steps as MirrorStep[] | null) ?? [];
  const targets = targetsOf((m.reference as Reference | null) ?? null, steps);
  if (!targets) return {error: 'Still reading the Reel. Try again in a moment.', status: 409};
  if (poses.length !== targets.length) return {error: 'One pose per step', status: 400};
  const r = gradeRoutine(targets, poses);
  const weakest = steps.length ? steps[r.stepScores.indexOf(Math.min(...r.stepScores))]?.name ?? null : null;
  const note = await scoreNote(r.score, r.score >= 85 ? null : weakest);
  const [saved] = await sql`
    insert into mirror_attempts (match_id, user_id, score, step_scores, note) values (${matchId}, ${user.id}, ${r.score}, ${JSON.stringify(r.stepScores)}::jsonb, ${note})
    on conflict (match_id, user_id) do update set score = excluded.score, step_scores = excluded.step_scores, note = excluded.note, created_at = now()
      where mirror_attempts.score < excluded.score
    returning score`;
  const [best] = saved ? [saved] : await sql`select score from mirror_attempts where match_id = ${matchId} and user_id = ${user.id}`;
  if (saved) await addSystemMessage(Number(m.conversation_id), user, `${first(user.name)} scored ${r.score} in ${mirrorTitle(m.mode as MirrorMode)}`);
  return {score: r.score, best: Number(best?.score ?? r.score), note, stepScores: r.stepScores};
}

/** Open matches in the player's chats, for "Your games" on Activities. */
export async function listOpenMirrors(userId: number): Promise<{id: number; conversationId: number; mode: MirrorMode; played: number; members: number; mine: number | null}[]> {
  const rows = await sql`
    select m.id, m.conversation_id, m.mode,
      (select count(*)::int from mirror_attempts a where a.match_id = m.id) as played,
      (select count(*)::int from conversation_members x where x.conversation_id = m.conversation_id) as members,
      (select score from mirror_attempts a where a.match_id = m.id and a.user_id = ${userId}) as mine
    from mirror_matches m
    join conversation_members cm on cm.conversation_id = m.conversation_id and cm.user_id = ${userId}
    where m.status = 'open' and m.ends_at > now() order by m.created_at desc limit 6`;
  return rows.map(r => ({id: Number(r.id), conversationId: Number(r.conversation_id), mode: r.mode as MirrorMode, played: Number(r.played), members: Number(r.members), mine: r.mine == null ? null : Number(r.mine)}));
}
