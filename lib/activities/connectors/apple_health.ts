import {randomBytes} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {sql} from '@/lib/db';
import {getConnection, revokeConnection, upsertConnection} from '@/lib/activities/connections';
import {deleteVaultSource, insertVaultEvent} from '@/lib/activities/vault';
import type {ConnectResult, Connector, EventKind, RawEvent} from '@/lib/activities/types';

/**
 * Apple Health (§5.2): no cloud API. Two real routes:
 *  1. an iOS Shortcut POSTs recent workouts/steps to /api/ingest/apple-health with a per-user token
 *  2. the user uploads export.zip / export.xml (Workout + StepCount records, capped at 5 MB)
 */
export const APPLE_EXPORT_CAP = 5 * 1024 * 1024;

const HK_KIND: Record<string, EventKind> = {
  HKWorkoutActivityTypeRunning: 'run', HKWorkoutActivityTypeWalking: 'walk', HKWorkoutActivityTypeHiking: 'walk', HKWorkoutActivityTypeCycling: 'ride',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'strength', HKWorkoutActivityTypeFunctionalStrengthTraining: 'strength', HKWorkoutActivityTypeHighIntensityIntervalTraining: 'strength',
  HKWorkoutActivityTypeYoga: 'yoga', HKWorkoutActivityTypePilates: 'yoga', HKWorkoutActivityTypeSwimming: 'swim',
  running: 'run', walking: 'walk', hiking: 'walk', cycling: 'ride', 'strength training': 'strength', 'traditional strength training': 'strength', 'functional strength training': 'strength', hiit: 'strength', yoga: 'yoga', swimming: 'swim',
};

export function mapAppleKind(type: string | undefined): EventKind {
  if (!type) return 'other';
  return HK_KIND[type] ?? HK_KIND[type.toLowerCase()] ?? 'other';
}

/** Shortcut payload: {events: [{type, start, end, distanceKm?, durationMin?, steps?, avgHr?}]} */
export type ShortcutEvent = {type?: string; start: string; end?: string; distanceKm?: number; distanceMi?: number; durationMin?: number; steps?: number; avgHr?: number; id?: string};

export function mapShortcutEvents(userId: number, events: ShortcutEvent[]): RawEvent[] {
  return events
    .filter(e => e?.start && !Number.isNaN(new Date(e.start).getTime()))
    .map(e => {
      const start = new Date(e.start);
      const isSteps = (e.type ?? '').toLowerCase().includes('step') || (e.steps != null && !e.type);
      const kind: EventKind = isSteps ? 'steps' : mapAppleKind(e.type);
      const end = e.end ? new Date(e.end) : e.durationMin ? new Date(start.getTime() + e.durationMin * 60_000) : undefined;
      const distanceKm = e.distanceKm ?? (e.distanceMi != null ? Math.round(e.distanceMi * 1.609_34 * 100) / 100 : undefined);
      return {
        userId,
        source: 'apple_health' as const,
        externalId: e.id ?? `apple:${userId}:${kind}:${start.toISOString()}`,
        kind,
        startedAt: start.toISOString(),
        endedAt: end?.toISOString(),
        durationMin: e.durationMin ?? (end ? Math.round((end.getTime() - start.getTime()) / 60_000) : undefined),
        distanceKm,
        steps: e.steps,
        avgHr: e.avgHr,
        trust: 'device' as const,
        displayScope: 'normal' as const,
      };
    });
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m?.[1];
}

/** Parse export.xml text: <Workout .../> and daily <Record type="HKQuantityTypeIdentifierStepCount"/> sums. */
export function parseAppleExportXml(userId: number, xml: string): RawEvent[] {
  const out: RawEvent[] = [];
  const workoutRe = /<Workout\b[^>]*?(?:\/>|>)/g;
  for (const m of xml.matchAll(workoutRe)) {
    const tag = m[0];
    const start = attr(tag, 'startDate');
    const end = attr(tag, 'endDate');
    if (!start) continue;
    const s = new Date(start);
    const e = end ? new Date(end) : undefined;
    const durationRaw = Number(attr(tag, 'duration'));
    const unit = attr(tag, 'durationUnit') ?? 'min';
    const durationMin = Number.isFinite(durationRaw) && durationRaw > 0 ? (unit === 's' ? durationRaw / 60 : unit === 'hr' ? durationRaw * 60 : durationRaw) : e ? (e.getTime() - s.getTime()) / 60_000 : undefined;
    const distRaw = Number(attr(tag, 'totalDistance'));
    const distUnit = attr(tag, 'totalDistanceUnit') ?? 'km';
    const distanceKm = Number.isFinite(distRaw) && distRaw > 0 ? Math.round((distUnit === 'mi' ? distRaw * 1.609_34 : distUnit === 'm' ? distRaw / 1000 : distRaw) * 100) / 100 : undefined;
    out.push({
      userId,
      source: 'apple_health',
      externalId: `apple-export:${userId}:${s.toISOString()}`,
      kind: mapAppleKind(attr(tag, 'workoutActivityType')),
      startedAt: s.toISOString(),
      endedAt: e?.toISOString(),
      durationMin: durationMin ? Math.round(durationMin) : undefined,
      distanceKm,
      trust: 'device',
      displayScope: 'normal',
    });
  }
  const steps = new Map<string, number>();
  const stepRe = /<Record\b[^>]*type="HKQuantityTypeIdentifierStepCount"[^>]*?\/?>/g;
  for (const m of xml.matchAll(stepRe)) {
    const start = attr(m[0], 'startDate');
    const value = Number(attr(m[0], 'value'));
    if (!start || !Number.isFinite(value)) continue;
    const day = start.slice(0, 10);
    steps.set(day, (steps.get(day) ?? 0) + value);
  }
  for (const [day, total] of steps) {
    const s = new Date(`${day}T00:00:00`);
    out.push({userId, source: 'apple_health', externalId: `apple-export:${userId}:steps:${day}`, kind: 'steps', startedAt: s.toISOString(), endedAt: new Date(s.getTime() + 86_399_000).toISOString(), steps: Math.round(total), trust: 'device', displayScope: 'normal'});
  }
  return out;
}

/** Minimal zip reader: finds apple_health_export/export.xml (stored or deflated) without a dependency. */
export function extractExportXml(buf: Buffer): string | null {
  let offset = 0;
  while (offset + 30 <= buf.length && buf.readUInt32LE(offset) === 0x04034b50) {
    const method = buf.readUInt16LE(offset + 8);
    const flags = buf.readUInt16LE(offset + 6);
    let compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    if (flags & 0x8 && compSize === 0) {
      // sizes in a data descriptor; fall back to the central directory for this entry
      const cd = findCentralSize(buf, name);
      if (cd == null) return null;
      compSize = cd;
    }
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (name.endsWith('export.xml') && !name.includes('export_cda')) {
      if (method === 0) return data.toString('utf8');
      if (method === 8) return inflateRawSync(data).toString('utf8');
      return null;
    }
    offset = dataStart + compSize + (flags & 0x8 ? 16 : 0);
  }
  return null;
}

function findCentralSize(buf: Buffer, name: string): number | null {
  let i = buf.length - 22;
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  if (i < 0) return null;
  let p = buf.readUInt32LE(i + 16);
  while (p + 46 <= buf.length && buf.readUInt32LE(p) === 0x02014b50) {
    const comp = buf.readUInt32LE(p + 20);
    const n = buf.readUInt16LE(p + 28);
    const e = buf.readUInt16LE(p + 30);
    const c = buf.readUInt16LE(p + 32);
    const entry = buf.subarray(p + 46, p + 46 + n).toString('utf8');
    if (entry === name) return comp;
    p += 46 + n + e + c;
  }
  return null;
}

export async function ingestAppleExport(userId: number, file: Buffer, filename: string): Promise<{imported: number; parsed: number}> {
  if (file.length > APPLE_EXPORT_CAP) throw new Error('Export is larger than 5 MB. Export a shorter range, or unzip and upload export.xml.');
  const xml = filename.toLowerCase().endsWith('.zip') || file.readUInt32LE(0) === 0x04034b50 ? extractExportXml(file) : file.toString('utf8');
  if (!xml) throw new Error('Could not find export.xml inside the zip.');
  const events = parseAppleExportXml(userId, xml);
  let imported = 0;
  for (const e of events.slice(-400)) {
    await insertVaultEvent(e);
    imported++;
  }
  const conn = await getConnection(userId, 'apple_health');
  await upsertConnection(userId, 'apple_health', {status: 'connected', tokens: {...(conn?.tokens ?? {}), last_sync: new Date().toISOString(), last_import: imported}});
  return {imported, parsed: events.length};
}

export async function ensureIngestToken(userId: number): Promise<string> {
  const existing = await getConnection(userId, 'apple_health');
  const current = existing?.tokens.ingest_token as string | undefined;
  if (current && existing?.status !== 'revoked') return current;
  const token = randomBytes(18).toString('base64url');
  await upsertConnection(userId, 'apple_health', {status: 'connected', tokens: {...(existing?.tokens ?? {}), ingest_token: token}});
  return token;
}

export async function findUserByIngestToken(token: string): Promise<number | null> {
  if (!token) return null;
  const rows = await sql`select user_id from connections where source = 'apple_health' and status = 'connected' and tokens->>'ingest_token' = ${token} limit 1`;
  return rows[0] ? Number(rows[0].user_id) : null;
}

export function shortcutSteps(origin: string, token: string): string[] {
  return [
    'On your iPhone, open Shortcuts and create a new shortcut.',
    'Add "Find Health Samples" (Workouts, last 7 days) and "Find Health Samples" (Steps, last 7 days).',
    `Add "Get Contents of URL": POST ${origin}/api/ingest/apple-health, header Authorization: Bearer ${token}, JSON body {"events": [...]} with type, start, end, distanceMi, durationMin or steps per sample.`,
    'Run it once now, then add it as a Personal Automation (daily, or when you close the Workout app).',
    'No Shortcut? Health app → profile → Export All Health Data, then upload the zip below (5 MB cap).',
  ];
}

export const appleHealthConnector: Connector = {
  id: 'apple_health',
  label: 'Apple Health',
  platforms: ['ios'],
  async connect(userId, origin): Promise<ConnectResult> {
    const token = await ensureIngestToken(userId);
    return {type: 'instructions', title: 'Apple Health has no cloud API, so your iPhone sends the data itself', steps: shortcutSteps(origin, token)};
  },
  async ingest(userId, payload): Promise<RawEvent[]> {
    const body = payload as {events?: ShortcutEvent[]} | ShortcutEvent[];
    const list = Array.isArray(body) ? body : body?.events ?? [];
    const events = mapShortcutEvents(userId, list.slice(0, 500));
    for (const e of events) await insertVaultEvent(e);
    const conn = await getConnection(userId, 'apple_health');
    if (events.length) await upsertConnection(userId, 'apple_health', {status: 'connected', tokens: {...(conn?.tokens ?? {}), last_sync: new Date().toISOString()}});
    return events;
  },
  async disconnect(userId, deleteData) {
    await revokeConnection(userId, 'apple_health');
    if (deleteData) await deleteVaultSource(userId, 'apple_health');
  },
};
