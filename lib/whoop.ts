import {whoopReadings} from '@/lib/whoop-readings';

const AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const API = 'https://api.prod.whoop.com/developer/v2';

export const WHOOP_SCOPES = [
  'offline',
  'read:profile',
  'read:recovery',
  'read:sleep',
  'read:workout',
  'read:cycles',
  'read:body_measurement',
].join(' ');

export function whoopConfigured() {
  return Boolean(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
}

export function whoopAuthorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: WHOOP_SCOPES,
    state,
  });
  return `${AUTH_URL}?${q.toString()}`;
}

export async function exchangeWhoopCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.WHOOP_CLIENT_ID ?? '',
    client_secret: process.env.WHOOP_CLIENT_SECRET ?? '',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!res.ok) throw new Error(`Whoop token ${res.status}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export async function refreshWhoopToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID ?? '',
    client_secret: process.env.WHOOP_CLIENT_SECRET ?? '',
    scope: 'offline',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!res.ok) throw new Error(`Whoop refresh ${res.status}`);
  return (await res.json()) as {access_token: string; refresh_token?: string; expires_in?: number};
}

export async function fetchWhoopSamples(accessToken: string) {
  const [recovery, sleep, cycle, workouts, body] = await Promise.all([
    whoopGet('/recovery?limit=1', accessToken).catch(() => null),
    whoopGet('/activity/sleep?limit=1', accessToken).catch(() => null),
    whoopGet('/cycle?limit=1', accessToken).catch(() => null),
    whoopGet('/activity/workout?limit=25', accessToken).catch(() => null),
    whoopGet('/user/measurement/body', accessToken).catch(() => null),
  ]);
  return whoopReadings({recovery, sleep, cycle, workouts, body});
}

export async function whoopGet(path: string, accessToken: string) {
  const res = await fetch(`${API}${path}`, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!res.ok) throw new Error(`Whoop ${path} ${res.status}`);
  return res.json();
}
