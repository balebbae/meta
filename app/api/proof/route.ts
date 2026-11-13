import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {manualEvent} from '@/lib/activities/connectors/manual';
import {isDhash} from '@/lib/activities/phash';
import {analyzeProof, type ProofResult} from '@/lib/activities/proof';
import type {RawEvent} from '@/lib/activities/types';
import {insertVaultEvent, proofPhotoReused, saveProofHash} from '@/lib/activities/vault';
import {museConfigured} from '@/lib/muse/client';

const MAX_DATA_URL = 1_600_000; // ~1.2 MB image; the client resizes first (lib/image-upload.ts)
const REUSED_FLAG = 'photo matches one you already used';

type Body = {image?: string; hash?: string; confirm?: ProofResult & {startedAt?: string}};

/** Save the event, remember the photo hash, and return the event plus any integrity flags. */
async function save(userId: number, event: RawEvent, hash: string | null, reused: boolean) {
  const saved = await insertVaultEvent(event);
  if (hash) await saveProofHash(userId, hash, saved.id).catch(() => {});
  const flags = reused ? [...saved.flags, REUSED_FLAG] : saved.flags;
  return {event: {...event, id: saved.id, duplicateOf: saved.duplicateOf, trust: saved.trust}, ...(flags.length ? {flags} : {})};
}

/**
 * Photo Proof (§5.2). POST {image: dataUrl, hash?} -> Muse vision reads the screen; if confident, the workout
 * is saved with trust 'photo'. Low confidence / Muse offline -> {needsConfirm: true} and the client shows
 * a prefilled (or empty) manual form, which it posts back as {confirm, hash?}. Numbers the user typed or
 * confirmed are 'self_reported' (plan 5b). `hash` is the browser's dHash of the photo (lib/activities/phash.ts);
 * a near match with this user's earlier proofs drops trust to 'self_reported' and adds a flag.
 */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<Body>(req);
    if (!body) return badRequest('Invalid JSON');
    // shortcut: the hash comes from the browser (no server image decoder), so a scripted client can omit it; hash server-side if sharp is ever added.
    const hash = isDhash(body.hash) ? body.hash : null;
    const reused = hash ? await proofPhotoReused(user.id, hash) : false;
    if (body.confirm) {
      const c = body.confirm;
      if (!c.kind) return badRequest('kind required');
      const event = manualEvent(user.id, {kind: c.kind, distanceKm: c.distanceKm, durationMin: c.durationMin, steps: c.steps, startedAt: c.startedAt, note: 'Photo Proof (confirmed by you)'}, 'self_reported', 'proof_photo');
      return NextResponse.json({saved: true, ...(await save(user.id, event, hash, reused)), usedMuse: false});
    }
    const image = body.image;
    if (!image?.startsWith('data:image/')) return badRequest('image (data URL) required');
    if (image.length > MAX_DATA_URL) return badRequest('Image too large; resize to under 1 MB');
    const outcome = await analyzeProof(image);
    const r = outcome.result;
    if (!r || r.verdict === 'not_a_workout' || r.verdict === 'unclear' || r.confidence < 0.6 || (!r.distanceKm && !r.durationMin && !r.steps)) {
      return NextResponse.json({saved: false, needsConfirm: true, result: r, usedMuse: outcome.usedMuse, museOffline: !museConfigured(), fallback: outcome.fallback, error: outcome.error});
    }
    const event = manualEvent(user.id, {kind: r.kind, distanceKm: r.distanceKm, durationMin: r.durationMin, steps: r.steps, note: `Photo Proof via ${outcome.model}`}, reused ? 'self_reported' : 'photo', 'proof_photo');
    return NextResponse.json({saved: true, needsConfirm: false, result: r, ...(await save(user.id, event, hash, reused)), usedMuse: true, model: outcome.model, fallback: outcome.fallback});
  });
}
