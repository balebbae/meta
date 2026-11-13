import {randomBytes} from 'node:crypto';
import {findConnectionByExternalUser, getConnection, revokeConnection, upsertConnection, type Connection} from '@/lib/activities/connections';
import {deleteVaultSource, insertVaultEvent} from '@/lib/activities/vault';
import type {ConnectResult, Connector, EventKind, RawEvent} from '@/lib/activities/types';
import {sql} from '@/lib/db';
import {getGame, importRoute, TurfError, type Game} from '@/lib/turf/store';
import {inArena} from '@/lib/turf/engine';
import {stravaGameEligible, stravaPoints, type StravaStreams} from '@/lib/activities/strava-turf';

/** Strava summaries are display_scope owner_only. */
const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';

export function stravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID?.trim() && process.env.STRAVA_CLIENT_SECRET?.trim());
}

type Tokens = {access_token: string; refresh_token: string; expires_at: number; state?: string; last_sync?: string};

async function tokenRequest(params: Record<string, string>): Promise<Tokens & {athlete?: {id: number}}> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({...params, client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET}),
  });
  if (!res.ok) throw new Error(`Strava token error ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as {access_token: string; refresh_token: string; expires_at: number; athlete?: {id: number}};
  return {access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at * 1000, athlete: j.athlete};
}

async function accessToken(conn: Connection): Promise<string> {
  const t = ((await getConnection(conn.userId, 'strava'))?.tokens ?? conn.tokens) as Tokens;
  if (t.expires_at > Date.now() + 60_000) return t.access_token;
  const next = await tokenRequest({grant_type: 'refresh_token', refresh_token: t.refresh_token});
  await upsertConnection(conn.userId, 'strava', {tokens: {...t, access_token: next.access_token, refresh_token: next.refresh_token, expires_at: next.expires_at}});
  return next.access_token;
}

const TYPE_KIND: Record<string, EventKind> = {Run: 'run', TrailRun: 'run', VirtualRun: 'run', Walk: 'walk', Hike: 'walk', Ride: 'ride', VirtualRide: 'ride', GravelRide: 'ride', MountainBikeRide: 'ride', WeightTraining: 'strength', Crossfit: 'strength', Workout: 'strength', Yoga: 'yoga', Pilates: 'yoga', Swim: 'swim'};

export type StravaActivity = {id: number; name?: string; sport_type?: string; type?: string; start_date: string; elapsed_time: number; moving_time?: number; distance?: number; average_heartrate?: number};

export function mapStravaActivity(userId: number, a: StravaActivity): RawEvent {
  const start = new Date(a.start_date);
  const durationMin = Math.max(1, Math.round((a.moving_time ?? a.elapsed_time) / 60));
  return {
    userId,
    source: 'strava',
    externalId: String(a.id),
    kind: TYPE_KIND[a.sport_type ?? a.type ?? ''] ?? 'other',
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + a.elapsed_time * 1000).toISOString(),
    durationMin,
    distanceKm: a.distance ? Math.round(a.distance / 10) / 100 : undefined,
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    trust: 'device',
    displayScope: 'owner_only',
    raw: {name: a.name, sport_type: a.sport_type},
  };
}

export async function exchangeCode(userId: number, code: string): Promise<Connection> {
  const t = await tokenRequest({grant_type: 'authorization_code', code});
  const conn = await upsertConnection(userId, 'strava', {status: 'connected', tokens: {access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at}, externalUserId: t.athlete ? String(t.athlete.id) : null});
  await backfill(conn).catch(() => 0);
  return conn;
}

export async function backfill(conn: Connection, limit = 20): Promise<number> {
  const res = await fetch(`${API}/athlete/activities?per_page=${limit}`, {headers: {authorization: `Bearer ${await accessToken(conn)}`}});
  if (!res.ok) throw new Error(`Strava backfill: ${res.status}`);
  const list = (await res.json()) as StravaActivity[];
  for (const a of list) {
    await insertVaultEvent(mapStravaActivity(conn.userId, a));
    await importStravaActivity(conn, a).catch(e => console.error('[strava] Turf import', e));
  }
  const current = await getConnection(conn.userId, 'strava');
  await upsertConnection(conn.userId, 'strava', {tokens: {...current?.tokens, last_sync: new Date().toISOString()}});
  return list.length;
}

async function importStravaActivity(conn: Connection, activity: StravaActivity, gameId?: number): Promise<number> {
  if (!['Run', 'TrailRun', 'Walk', 'Hike'].includes(activity.sport_type ?? activity.type ?? '')) return 0;
  const invites = await sql`select game_id from game_invites where user_id = ${conn.userId} and status = 'accepted'
    and (${gameId ?? null}::int is null or game_id = ${gameId ?? null})`;
  const games = (await Promise.all(invites.map(r => getGame(Number(r.game_id)))))
    .filter((g): g is Game => g != null && stravaGameEligible(activity, g, 'accepted'));
  if (!games.length) return 0;
  const res = await fetch(`${API}/activities/${activity.id}/streams?keys=latlng,time&key_by_type=true`, {
    headers: {authorization: `Bearer ${await accessToken(conn)}`},
  });
  if (!res.ok) throw new TurfError(`Could not read Strava GPS (${res.status}). Reconnect Strava with permission to read private activities.`, 502);
  const points = stravaPoints(activity.start_date, await res.json() as StravaStreams);
  if (points.length < 2) return 0;
  const [user] = await sql`select name from users where id = ${conn.userId}`;
  let gained = 0;
  for (const game of games) {
    if (!points.some(p => inArena(p, {center: game.settings.center, radiusKm: game.settings.radiusKm}))) continue;
    gained += (await importRoute(game, {id: conn.userId, name: String(user.name)}, points, 'strava', true, String(activity.id))).gained;
  }
  return gained;
}

export async function importRecentStravaRuns(userId: number, gameId: number): Promise<{gained: number}> {
  if (!stravaConfigured()) throw new TurfError('Strava is not configured for this demo.', 503);
  const conn = await getConnection(userId, 'strava');
  if (conn?.status !== 'connected') throw new TurfError('Connect Strava in Activities first (or reconnect to allow private runs).', 409);
  const res = await fetch(`${API}/athlete/activities?per_page=20`, {headers: {authorization: `Bearer ${await accessToken(conn)}`}});
  if (!res.ok) throw new TurfError(`Could not fetch Strava runs (${res.status}). Try reconnecting Strava.`, 502);
  let gained = 0;
  for (const activity of await res.json() as StravaActivity[]) gained += await importStravaActivity(conn, activity, gameId);
  return {gained};
}

export type StravaWebhook = {object_type: 'activity' | 'athlete'; aspect_type: 'create' | 'update' | 'delete'; object_id: number; owner_id: number};

export const stravaConnector: Connector = {
  id: 'strava',
  label: 'Strava',
  platforms: ['ios', 'android', 'web'],
  async connect(userId, origin): Promise<ConnectResult> {
    if (!stravaConfigured()) return {type: 'unavailable', reason: 'Not configured for this demo (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET missing).'};
    const state = randomBytes(8).toString('hex');
    await upsertConnection(userId, 'strava', {status: 'pending', tokens: {state}});
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', process.env.STRAVA_CLIENT_ID!);
    url.searchParams.set('redirect_uri', `${origin}/api/connect/strava/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('approval_prompt', 'auto');
    url.searchParams.set('scope', 'activity:read,activity:read_all');
    url.searchParams.set('state', state);
    return {type: 'redirect', url: url.toString()};
  },
  async ingest(_userId, payload): Promise<RawEvent[]> {
    const hook = payload as StravaWebhook;
    // Webhooks are unsigned: object_id goes into an API path, so only plain numeric ids get through.
    if (hook?.object_type !== 'activity' || !/^\d{1,20}$/.test(String(hook.object_id)) || !/^\d{1,20}$/.test(String(hook.owner_id))) return [];
    const conn = await findConnectionByExternalUser('strava', String(hook.owner_id));
    if (!conn) return [];
    if (hook.aspect_type !== 'create' && hook.aspect_type !== 'update') return [];
    const res = await fetch(`${API}/activities/${hook.object_id}`, {headers: {authorization: `Bearer ${await accessToken(conn)}`}});
    if (!res.ok) return [];
    const activity = (await res.json()) as StravaActivity;
    const e = mapStravaActivity(conn.userId, activity);
    await insertVaultEvent(e);
    await importStravaActivity(conn, activity).catch(e => console.error('[strava] Turf import', e));
    return [e];
  },
  async disconnect(userId, deleteData) {
    const conn = await getConnection(userId, 'strava');
    const token = (conn?.tokens as Tokens | undefined)?.access_token;
    if (token) await fetch('https://www.strava.com/oauth/deauthorize', {method: 'POST', headers: {authorization: `Bearer ${token}`}}).catch(() => {});
    await revokeConnection(userId, 'strava');
    if (deleteData) await deleteVaultSource(userId, 'strava');
  },
};
