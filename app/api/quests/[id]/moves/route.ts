import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {logMove, type ClipInput, type MoveSource} from '@/lib/rally/queries';
import {CLIP_EXERCISES} from '@/lib/rally/repcount';
import {BODY_EXERCISES} from '@/lib/rally/proof-fusion';

const POSE_LABELS = [...BODY_EXERCISES, 'none'];

export const maxDuration = 60; // room for the background Glimmer clip check (after())

type Ctx = {params: Promise<{id: string}>};
const SOURCES: MoveSource[] = ['manual', 'photo', 'voice', 'vault', 'clip'];

/** Clip proof from the phone: exercise, a per-frame joint signal (≤ 2 min at ≤ 30 fps), the pose verdict and 1-3 JPEG stills. */
function parseClip(c: unknown): ClipInput | string {
  const v = c as Partial<ClipInput> | null;
  if (!v || typeof v.exercise !== 'string' || !Object.hasOwn(CLIP_EXERCISES, v.exercise)) return 'clip.exercise must be one of ' + Object.keys(CLIP_EXERCISES).join(', ');
  const fps = Number(v.fps);
  if (!Number.isFinite(fps) || fps < 5 || fps > 30) return 'clip.fps must be 5-30';
  if (!Array.isArray(v.signal) || v.signal.length < 10 || v.signal.length > fps * 120) return 'clip.signal must cover 1 s to 2 min';
  if (!v.signal.every(x => x === null || (typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1000))) return 'clip.signal must be numbers or null';
  if (!Array.isArray(v.frames) || v.frames.length < 1 || v.frames.length > 3 || !v.frames.every(f => typeof f === 'string' && f.startsWith('data:image/jpeg') && f.length < 400_000)) return 'clip.frames must be 1-3 JPEG data URLs';
  const p = v.pose;
  if (p != null && !(typeof p === 'object' && (POSE_LABELS as string[]).includes(p.exercise) && typeof p.confidence === 'number' && p.confidence >= 0 && p.confidence <= 1 && typeof p.abstain === 'boolean' && typeof p.person_found === 'boolean' && (p.reps == null || (Number.isInteger(p.reps) && p.reps >= 0 && p.reps < 10_000)))) return 'clip.pose must be {exercise, confidence 0-1, abstain, person_found, reps}';
  // rebuilt field by field so nothing else from the phone (e.g. `supported`) reaches fusion
  const pose = p ? {exercise: p.exercise, confidence: p.confidence, abstain: p.abstain, person_found: p.person_found, reps: p.reps ?? null} : null;
  return {exercise: v.exercise, fps, signal: v.signal, frames: v.frames, pose};
}

/** Body: {source, vaultEventId?, note?, image?(data URL), amount?, clip?}. Scores the move, updates HP, posts the rally_game card. */
export async function POST(req: Request, {params}: Ctx) {
  return withUser(async user => {
    const id = Number((await params).id);
    const body = await readJson<{source?: MoveSource; vaultEventId?: number; note?: string; image?: string; amount?: number; clip?: unknown}>(req);
    const source = body?.source ?? 'manual';
    if (!id || !SOURCES.includes(source)) return badRequest('valid source required');
    if (body?.image && (!body.image.startsWith('data:image/') || body.image.length > 1_500_000)) return badRequest('image must be a data URL under ~1 MB');
    const clip = source === 'clip' ? parseClip(body?.clip) : null;
    if (typeof clip === 'string') return badRequest(clip);
    const result = await logMove(id, {id: user.id, name: user.name}, {source, vaultEventId: body?.vaultEventId ?? null, note: body?.note ?? null, image: clip ? null : body?.image ?? null, amount: body?.amount ?? null, clip});
    if (!result.ok) return NextResponse.json({error: result.error}, {status: result.status});
    return NextResponse.json(result, {status: 201});
  });
}
