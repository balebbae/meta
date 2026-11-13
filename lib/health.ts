import {randomBytes} from 'node:crypto';
import {sql} from '@/lib/db';
import {cleanHealthSample} from '@/lib/health-format';

export type HealthSource = 'whoop' | 'apple_health' | 'health_connect';

export async function issueHealthToken(userId: number) {
  const token = randomBytes(24).toString('hex');
  await sql`
    insert into health_sync_tokens (token, user_id, expires_at)
    values (${token}, ${userId}, now() + interval '10 minutes')`;
  return token;
}

export async function userIdForHealthToken(token: string) {
  const [row] = await sql`
    delete from health_sync_tokens
    where token = ${token} and expires_at > now()
    returning user_id`;
  return (row?.user_id as number | undefined) ?? null;
}

export async function insertHealthSamples(
  userId: number,
  source: HealthSource,
  samples: {metric: string; value: number; unit: string; recordedAt: string}[],
) {
  const clean = samples.map(cleanHealthSample).filter(s => s != null).slice(0, 200);
  if (!clean.length) return 0;
  if (source !== 'whoop') {
    await sql`delete from health_samples where user_id = ${userId} and source = ${source}`;
  }
  for (const s of clean) {
    await sql`
      insert into health_samples (user_id, source, metric, value, unit, recorded_at)
      values (${userId}, ${source}, ${s.metric}, ${s.value}, ${s.unit}, ${s.recordedAt})`;
  }
  return clean.length;
}

export async function latestHealth(userId: number) {
  const rows = await sql`
    select distinct on (source, metric) source, metric, value, unit, recorded_at
    from health_samples
    where user_id = ${userId}
      and recorded_at > now() - interval '14 days'
    order by source, metric, recorded_at desc`;
  return rows.map(r => ({
    source: r.source as string,
    metric: r.metric as string,
    value: Number(r.value),
    unit: r.unit as string,
    recordedAt: String(r.recorded_at),
  }));
}
