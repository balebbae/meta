import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {sql} from '@/lib/db';
import {findConnectionByExternalUser, getConnection, revokeConnection, upsertConnection, type Connection} from '@/lib/activities/connections';
import {deleteVaultSource, insertVaultEvent} from '@/lib/activities/vault';
import type {ConnectResult, Connector, EventKind, RawEvent} from '@/lib/activities/types';

/**
 * WHOOP (§5.3). Deterministic path only: webhook -> fetch v2 workout -> normalize -> vault.
 * No Muse model ever receives WHOOP fields; avg HR and strain are owner-only.
 */
const AUTHORIZE_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const API = 'https://api.prod.whoop.com/developer/v2';
const SCOPES = 'read:workout read:cycles read:recovery offline';

export function whoopConfigured(): boolean {
  return Boolean(process.env.WHOOP_CLIENT_ID?.trim() && process.env.WHOOP_CLIENT_SECRET?.trim());
}

/** Same URI as the Health flow so WHOOP needs exactly one pre-registered redirect URL; /api/whoop/callback hands this flow back to /api/connect/whoop/callback. */
function redirectUri(origin: string) {
  return `${origin}/api/whoop/callback`;
}

type Tokens = {access_token: string; refresh_token: string; expires_at: number; scope?: string; state?: string; last_sync?: string};

async function tokenRequest(params: Record<string, string>): Promise<Tokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({...params, client_id: process.env.WHOOP_CLIENT_ID!, client_secret: process.env.WHOOP_CLIENT_SECRET!}),
  });
  if (!res.ok) throw new Error(`WHOOP token error ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as {access_token: string; refresh_token: string; expires_in: number; scope?: string};
  return {access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in - 60) * 1000, scope: j.scope};
}

/** Refresh rotates both tokens, so it is single-flight per user via connections.refresh_lock_until. */
async function accessToken(conn: Connection): Promise<string> {
  const t = conn.tokens as Tokens;
  if (t.access_token && t.expires_at > Date.now()) return t.access_token;
  const lock = await sql`
    update connections set refresh_lock_until = now() + interval '30 seconds'
    where id = ${conn.id} and (refresh_lock_until is null or refresh_lock_until < now()) returning id`;
  if (!lock.length) {
    // someone else is refreshing: wait and re-read
    await new Promise(r => setTimeout(r, 1500));
    const fresh = await getConnection(conn.userId, 'whoop');
    if (fresh && (fresh.tokens as Tokens).expires_at > Date.now()) return (fresh.tokens as Tokens).access_token;
    throw new Error('WHOOP token refresh in progress');
  }
  try {
    const next = await tokenRequest({grant_type: 'refresh_token', refresh_token: t.refresh_token, scope: 'offline'});
    await upsertConnection(conn.userId, 'whoop', {tokens: {...t, ...next}});
    return next.access_token;
  } finally {
    await sql`update connections set refresh_lock_until = null where id = ${conn.id}`;
  }
}

const SPORT_KIND: Record<string, EventKind> = {
  running: 'run', walking: 'walk', hiking: 'walk', cycling: 'ride', 'mountain biking': 'ride', spin: 'ride',
  weightlifting: 'strength', functional_fitness: 'strength', 'functional fitness': 'strength', powerlifting: 'strength', crossfit: 'strength',
  yoga: 'yoga', pilates: 'yoga', stretching: 'yoga', swimming: 'swim',
};

export type WhoopWorkout = {
  id: string;
  user_id: number;
  start: string;
  end: string;
  sport_name?: string;
  sport_id?: number;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: {strain?: number; average_heart_rate?: number; max_heart_rate?: number; distance_meter?: number; kilojoule?: number};
};

/** Pure mapping (unit-testable). Returns null while WHOOP hasn't scored the workout yet. */
export function mapWhoopWorkout(userId: number, w: WhoopWorkout): RawEvent | null {
  if (w.score_state !== 'SCORED') return null;
  const start = new Date(w.start);
  const end = new Date(w.end);
  const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  const sport = (w.sport_name ?? '').toLowerCase();
  const distanceKm = w.score?.distance_meter ? Math.round(w.score.distance_meter / 10) / 100 : undefined;
  return {
    userId,
    source: 'whoop',
    externalId: w.id,
    kind: SPORT_KIND[sport] ?? 'other',
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMin,
    distanceKm,
    avgHr: w.score?.average_heart_rate,
    trust: 'verified',
    displayScope: 'normal',
    // No raw WHOOP payload is cached (§21.1): keep only strain + the id, re-fetch details on demand.
    raw: {whoop_id: w.id, strain: w.score?.strain, owner_only: ['avg_hr', 'strain']},
  };
}

async function fetchWorkout(conn: Connection, id: string): Promise<WhoopWorkout> {
  const res = await fetch(`${API}/activity/workout/${id}`, {headers: {authorization: `Bearer ${await accessToken(conn)}`}});
  if (!res.ok) throw new Error(`WHOOP workout ${id}: ${res.status}`);
  return (await res.json()) as WhoopWorkout;
}

export async function backfill(conn: Connection, limit = 25): Promise<number> {
  const start = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
  let next: string | undefined;
  let count = 0;
  do {
    const url = new URL(`${API}/activity/workout`);
    url.searchParams.set('start', start);
    url.searchParams.set('limit', String(Math.min(25, limit - count)));
    if (next) url.searchParams.set('nextToken', next);
    const res = await fetch(url, {headers: {authorization: `Bearer ${await accessToken(conn)}`}});
    if (!res.ok) throw new Error(`WHOOP backfill: ${res.status}`);
    const j = (await res.json()) as {records: WhoopWorkout[]; next_token?: string};
    for (const w of j.records ?? []) {
      const e = mapWhoopWorkout(conn.userId, w);
      if (e) {
        await insertVaultEvent(e);
        count++;
      }
    }
    next = j.next_token;
  } while (next && count < limit);
  await upsertConnection(conn.userId, 'whoop', {tokens: {...conn.tokens, last_sync: new Date().toISOString()}});
  return count;
}

/** base64(HMAC_SHA256(timestamp + rawBody, client_secret)) == X-WHOOP-Signature */
export function verifyWhoopSignature(rawBody: string, timestamp: string | null, signature: string | null, secret = process.env.WHOOP_CLIENT_SECRET ?? ''): boolean {
  if (!timestamp || !signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type WhoopWebhook = {user_id: number; id: string; type: string; trace_id?: string};

export async function exchangeCode(userId: number, code: string, origin: string): Promise<Connection> {
  const t = await tokenRequest({grant_type: 'authorization_code', code, redirect_uri: redirectUri(origin)});
  const me = await fetch(`${API}/user/profile/basic`, {headers: {authorization: `Bearer ${t.access_token}`}}).then(r => (r.ok ? r.json() : null)).catch(() => null) as {user_id?: number} | null;
  return upsertConnection(userId, 'whoop', {status: 'connected', tokens: {...t}, externalUserId: me?.user_id != null ? String(me.user_id) : null});
}

export const whoopConnector: Connector = {
  id: 'whoop',
  label: 'WHOOP',
  platforms: ['ios', 'android', 'web'],
  async connect(userId, origin): Promise<ConnectResult> {
    if (!whoopConfigured()) return {type: 'unavailable', reason: 'Not configured for this demo (WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET missing).'};
    const state = randomBytes(4).toString('hex'); // exactly 8 characters
    await upsertConnection(userId, 'whoop', {status: 'pending', tokens: {state}});
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', process.env.WHOOP_CLIENT_ID!);
    url.searchParams.set('redirect_uri', redirectUri(origin));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('state', state);
    return {type: 'redirect', url: url.toString()};
  },
  /** payload = parsed webhook body, already signature-verified by the route. */
  async ingest(_userId, payload): Promise<RawEvent[]> {
    const hook = payload as WhoopWebhook;
    if (!hook?.id || !hook.type) return [];
    const conn = await findConnectionByExternalUser('whoop', String(hook.user_id));
    if (!conn) return [];
    if (hook.type === 'workout.deleted') {
      await sql`delete from vault_events where source = 'whoop' and external_id = ${hook.id} and user_id = ${conn.userId}`;
      return [];
    }
    if (hook.type !== 'workout.updated') return []; // sleep/recovery stay owner-only and are not imported in this demo
    const e = mapWhoopWorkout(conn.userId, await fetchWorkout(conn, hook.id));
    if (!e) return [];
    await insertVaultEvent(e);
    await upsertConnection(conn.userId, 'whoop', {tokens: {...conn.tokens, last_sync: new Date().toISOString()}});
    return [e];
  },
  async disconnect(userId, deleteData) {
    await revokeConnection(userId, 'whoop');
    if (deleteData) await deleteVaultSource(userId, 'whoop');
  },
};
