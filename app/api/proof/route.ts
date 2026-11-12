import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {manualEvent} from '@/lib/activities/connectors/manual';
import {analyzeProof, type ProofResult} from '@/lib/activities/proof';
import {insertVaultEvent} from '@/lib/activities/vault';
import {museConfigured} from '@/lib/muse/client';

const MAX_DATA_URL = 1_600_000; // ~1.2 MB image; the client resizes first (lib/image-upload.ts)

type Body = {image?: string; confirm?: ProofResult & {startedAt?: string}};

/**
 * Photo Proof (§5.2). POST {image: dataUrl} -> Muse vision reads the screen; if confident, the workout
 * is saved with trust 'photo'. Low confidence / Muse offline -> {needsConfirm: true} and the client shows
 * a prefilled (or empty) manual form, which it posts back as {confirm}.
 */
export async function POST(req: Request) {
  return withUser(async user => {
    const body = await readJson<Body>(req);
    if (!body) return badRequest('Invalid JSON');
    if (body.confirm) {
      const c = body.confirm;
      if (!c.kind) return badRequest('kind required');
      const event = manualEvent(user.id, {kind: c.kind, distanceKm: c.distanceKm, durationMin: c.durationMin, steps: c.steps, startedAt: c.startedAt, note: 'Photo Proof (confirmed by you)'}, 'photo', 'proof_photo');
      const saved = await insertVaultEvent(event);
      return NextResponse.json({saved: true, event: {...event, id: saved.id}, usedMuse: false});
    }
    const image = body.image;
    if (!image?.startsWith('data:image/')) return badRequest('image (data URL) required');
    if (image.length > MAX_DATA_URL) return badRequest('Image too large; resize to under 1 MB');
    const outcome = await analyzeProof(image);
    const r = outcome.result;
    if (!r || r.verdict === 'not_a_workout' || r.verdict === 'unclear' || r.confidence < 0.6 || (!r.distanceKm && !r.durationMin && !r.steps)) {
      return NextResponse.json({saved: false, needsConfirm: true, result: r, usedMuse: outcome.usedMuse, museOffline: !museConfigured(), fallback: outcome.fallback, error: outcome.error});
    }
    const event = manualEvent(user.id, {kind: r.kind, distanceKm: r.distanceKm, durationMin: r.durationMin, steps: r.steps, note: `Photo Proof via ${outcome.model}`}, 'photo', 'proof_photo');
    const saved = await insertVaultEvent(event);
    return NextResponse.json({saved: true, needsConfirm: false, result: r, event: {...event, id: saved.id}, usedMuse: true, model: outcome.model, fallback: outcome.fallback});
  });
}
