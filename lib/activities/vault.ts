import {sql} from '@/lib/db';
import {applyIntegrity} from '@/lib/activities/integrity';
import {isReused} from '@/lib/activities/phash';
import {TRUST_RANK, type RawEvent, type Trust} from '@/lib/activities/types';

export type VaultEvent = RawEvent & {id: number; duplicateOf: number | null; createdAt: string};

function mapRow(r: Record<string, unknown>): VaultEvent {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    source: r.source as VaultEvent['source'],
    externalId: String(r.external_id ?? ''),
    kind: r.kind as VaultEvent['kind'],
    startedAt: String(r.started_at),
    endedAt: r.ended_at ? String(r.ended_at) : undefined,
    distanceKm: r.distance_km == null ? undefined : Number(r.distance_km),
    durationMin: r.duration_min == null ? undefined : Number(r.duration_min),
    steps: r.steps == null ? undefined : Number(r.steps),
    avgHr: r.avg_hr == null ? undefined : Number(r.avg_hr),
    trust: r.trust as Trust,
    displayScope: (r.display_scope as 'normal' | 'owner_only') ?? 'normal',
    duplicateOf: r.duplicate_of == null ? null : Number(r.duplicate_of),
    createdAt: String(r.created_at),
  };
}

function overlapRatio(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const inter = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
  const shortest = Math.max(1, Math.min(aEnd - aStart, bEnd - bStart));
  return inter / shortest;
}

/**
 * Insert a normalized event into the owner's vault. Events of the same kind overlapping >80% in time
 * are merged: the highest-trust one stays primary, the others are linked via duplicate_of (§5.1).
 * Returns the primary event id (the inserted one, or the existing higher-trust one).
 */
export async function insertVaultEvent(input: RawEvent): Promise<{id: number; duplicateOf: number | null; trust: Trust; flags: string[]}> {
  const {flags, ...e} = applyIntegrity(input);
  const [row] = await sql`
    insert into vault_events (user_id, source, external_id, kind, started_at, ended_at, distance_km, duration_min, steps, avg_hr, trust, display_scope, raw)
    values (${e.userId}, ${e.source}, ${e.externalId}, ${e.kind}, ${e.startedAt}, ${e.endedAt ?? null}, ${e.distanceKm ?? null}, ${e.durationMin ?? null},
            ${e.steps ?? null}, ${e.avgHr ?? null}, ${e.trust}, ${e.displayScope ?? 'normal'}, ${e.raw == null ? null : JSON.stringify(e.raw)})
    on conflict (source, external_id) do update set
      ended_at = excluded.ended_at, distance_km = excluded.distance_km, duration_min = excluded.duration_min,
      steps = excluded.steps, avg_hr = excluded.avg_hr, trust = excluded.trust, raw = excluded.raw
    returning id`;
  const id = Number(row.id);
  if (e.kind === 'steps' || e.kind === 'sleep' || e.kind === 'recovery') return {id, duplicateOf: null, trust: e.trust, flags};

  const start = new Date(e.startedAt).getTime();
  const end = e.endedAt ? new Date(e.endedAt).getTime() : start + (e.durationMin ?? 30) * 60_000;
  const candidates = await sql`
    select id, started_at, ended_at, duration_min, trust from vault_events
    where user_id = ${e.userId} and kind = ${e.kind} and id <> ${id} and duplicate_of is null
      and started_at between ${new Date(start - 6 * 3_600_000).toISOString()} and ${new Date(end + 6 * 3_600_000).toISOString()}`;
  for (const c of candidates) {
    const cs = new Date(String(c.started_at)).getTime();
    const ce = c.ended_at ? new Date(String(c.ended_at)).getTime() : cs + Number(c.duration_min ?? 30) * 60_000;
    if (overlapRatio(start, end, cs, ce) <= 0.8) continue;
    const existingWins = TRUST_RANK[c.trust as Trust] >= TRUST_RANK[e.trust];
    if (existingWins) {
      await sql`update vault_events set duplicate_of = ${Number(c.id)} where id = ${id}`;
      return {id: Number(c.id), duplicateOf: Number(c.id), trust: e.trust, flags};
    }
    await sql`update vault_events set duplicate_of = ${id} where id = ${Number(c.id)} or duplicate_of = ${Number(c.id)}`;
  }
  return {id, duplicateOf: null, trust: e.trust, flags};
}

/** Primary (non-duplicate) events, newest first. Owner-facing only; other audiences go through answers.ts. */
export async function listVaultEvents(userId: number, opts: {since?: string; limit?: number; includeDuplicates?: boolean} = {}): Promise<VaultEvent[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const since = opts.since ?? new Date(0).toISOString();
  const rows = opts.includeDuplicates
    ? await sql`select * from vault_events where user_id = ${userId} and started_at >= ${since} order by started_at desc limit ${limit}`
    : await sql`select * from vault_events where user_id = ${userId} and started_at >= ${since} and duplicate_of is null order by started_at desc limit ${limit}`;
  return rows.map(mapRow);
}

export async function deleteVaultSource(userId: number, source: string): Promise<number> {
  const rows = await sql`delete from vault_events where user_id = ${userId} and source = ${source} returning id`;
  return rows.length;
}

/** Photo Proof reuse check (plan 5b): true when this user already submitted a near-identical photo. */
export async function proofPhotoReused(userId: number, hash: string): Promise<boolean> {
  const rows = await sql`select hash from proof_photo_hashes where user_id = ${userId} order by id desc limit 1000`;
  return isReused(hash, rows.map(r => String(r.hash)));
}

export async function saveProofHash(userId: number, hash: string, vaultEventId: number): Promise<void> {
  await sql`insert into proof_photo_hashes (user_id, hash, vault_event_id) values (${userId}, ${hash}, ${vaultEventId})`;
}
