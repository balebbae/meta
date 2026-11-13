import {NextResponse} from 'next/server';
import {badRequest, readJson, withUser} from '@/lib/api';
import {insertXpEvent} from '@/lib/closeness-queries';
import {insertHealthSamples, userIdForHealthToken, type HealthSource} from '@/lib/health';
import {requireDatabase} from '@/lib/muse/guard';

const SOURCES: HealthSource[] = ['apple_health', 'health_connect', 'whoop'];

export async function POST(req: Request) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  const body = await readJson<{
    source?: string;
    samples?: {metric: string; value: number; unit: string; recordedAt: string}[];
  }>(req);
  if (!body?.source || !SOURCES.includes(body.source as HealthSource)) return badRequest('invalid source');
  if (!Array.isArray(body.samples) || body.samples.length === 0) return badRequest('samples required');

  const header = req.headers.get('authorization') ?? '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

  const save = async (userId: number) => {
    const saved = await insertHealthSamples(userId, body.source as HealthSource, body.samples!.slice(0, 200));
    if (saved > 0) {
      await insertXpEvent({
        userId,
        sourceType: 'health',
        xp: 8,
        reason: `Synced ${saved} ${body.source} samples`,
      });
    }
    return NextResponse.json({ok: true, saved});
  };

  if (bearer) {
    const userId = await userIdForHealthToken(bearer);
    if (!userId) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    return save(userId);
  }

  return withUser(user => save(user.id));
}
