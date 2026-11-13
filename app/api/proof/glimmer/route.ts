import {NextResponse} from 'next/server';
import {withUser} from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/proof/glimmer: is the self-hosted fine-tuned Glimmer (Rally clip proof) configured in this deployment, and
 * can the deployment reach it? Never returns the key or the full URL.
 */
export async function GET() {
  return withUser(async () => status());
}

async function status() {
  const url = process.env.GLIMMER_PROOF_URL?.trim();
  const key = process.env.GLIMMER_PROOF_KEY?.trim();
  const model = process.env.GLIMMER_PROOF_MODEL?.trim() || 'exercise_check';
  if (!url) return NextResponse.json({configured: false, note: 'GLIMMER_PROOF_URL is not set in this deployment: clip proof uses Ember.'});
  let host = 'invalid URL';
  try {
    host = new URL(url).host;
  } catch {}
  const t0 = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/models`, {headers: key ? {authorization: `Bearer ${key}`} : {}, signal: AbortSignal.timeout(8000), cache: 'no-store'});
    const body = res.ok ? ((await res.json()) as {data?: {id: string}[]}) : null;
    const served = body?.data?.map(m => m.id) ?? [];
    return NextResponse.json({configured: true, host, endsWithV1: /\/v1\/?$/.test(url), keySet: Boolean(key), status: res.status, modelServed: served.includes(model), model, ms: Date.now() - t0});
  } catch (err) {
    return NextResponse.json({configured: true, host, endsWithV1: /\/v1\/?$/.test(url), keySet: Boolean(key), reachable: false, error: err instanceof Error ? err.name : 'unknown', ms: Date.now() - t0});
  }
}
