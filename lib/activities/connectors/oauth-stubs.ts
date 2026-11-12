import {randomBytes} from 'node:crypto';
import {revokeConnection, upsertConnection} from '@/lib/activities/connections';
import {deleteVaultSource} from '@/lib/activities/vault';
import type {ConnectResult, Connector, ConnectorId, RawEvent} from '@/lib/activities/types';

/**
 * OAuth stubs behind env vars (§5.2 "real if someone has the account, else mock"): Oura and Google Health.
 * The authorize/token URLs are the real ones; ingest acknowledges webhooks but maps nothing yet.
 */
type OAuthSpec = {id: ConnectorId; label: string; authorize: string; token: string; scope: string; envId: string; envSecret: string; extra?: Record<string, string>};

export const OURA: OAuthSpec = {id: 'oura', label: 'Oura', authorize: 'https://cloud.ouraring.com/oauth/authorize', token: 'https://api.ouraring.com/oauth/token', scope: 'daily workout heartrate', envId: 'OURA_CLIENT_ID', envSecret: 'OURA_CLIENT_SECRET'};
export const GOOGLE_HEALTH: OAuthSpec = {
  id: 'google_health',
  label: 'Google Health (Fitbit, Pixel Watch)',
  authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  scope: 'https://www.googleapis.com/auth/fitness.activity.read',
  envId: 'GOOGLE_HEALTH_CLIENT_ID',
  envSecret: 'GOOGLE_HEALTH_CLIENT_SECRET',
  extra: {access_type: 'offline', prompt: 'consent'},
};

export function oauthConfigured(spec: OAuthSpec): boolean {
  return Boolean(process.env[spec.envId]?.trim() && process.env[spec.envSecret]?.trim());
}

export async function exchangeStubCode(spec: OAuthSpec, userId: number, code: string, origin: string) {
  const res = await fetch(spec.token, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'authorization_code', code, redirect_uri: `${origin}/api/connect/${spec.id}/callback`, client_id: process.env[spec.envId]!, client_secret: process.env[spec.envSecret]!}),
  });
  if (!res.ok) throw new Error(`${spec.label} token error ${res.status}`);
  const j = (await res.json()) as {access_token: string; refresh_token?: string; expires_in?: number};
  return upsertConnection(userId, spec.id, {status: 'connected', tokens: {access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000}});
}

export function makeOAuthStub(spec: OAuthSpec): Connector {
  return {
    id: spec.id,
    label: spec.label,
    platforms: ['ios', 'android', 'web'],
    async connect(userId, origin): Promise<ConnectResult> {
      if (!oauthConfigured(spec)) return {type: 'unavailable', reason: `Not configured for this demo (${spec.envId} / ${spec.envSecret} missing).`};
      const state = randomBytes(8).toString('hex');
      await upsertConnection(userId, spec.id, {status: 'pending', tokens: {state}});
      const url = new URL(spec.authorize);
      url.searchParams.set('client_id', process.env[spec.envId]!);
      url.searchParams.set('redirect_uri', `${origin}/api/connect/${spec.id}/callback`);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', spec.scope);
      url.searchParams.set('state', state);
      for (const [k, v] of Object.entries(spec.extra ?? {})) url.searchParams.set(k, v);
      return {type: 'redirect', url: url.toString()};
    },
    async ingest(): Promise<RawEvent[]> {
      return []; // webhook acknowledged; mapping lands when a teammate has the device
    },
    async disconnect(userId, deleteData) {
      await revokeConnection(userId, spec.id);
      if (deleteData) await deleteVaultSource(userId, spec.id);
    },
  };
}
