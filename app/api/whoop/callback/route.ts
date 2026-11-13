import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {sql} from '@/lib/db';
import {insertHealthSamples} from '@/lib/health';
import {exchangeWhoopCode, whoopGet} from '@/lib/whoop';
import {GET as connectCallback} from '@/app/api/connect/[source]/callback/route';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = req.headers.get('cookie') ?? '';
  const saved = cookie.match(/(?:^|;\s*)whoop_oauth_state=([^;]+)/)?.[1];
  if (!saved) return connectCallback(req, {params: Promise.resolve({source: 'whoop'})});
  const fail = (msg: string) => NextResponse.redirect(new URL(`/health?whoop=error&msg=${encodeURIComponent(msg)}`, url.origin));

  if (!code || !state || !saved || state !== saved) return fail('oauth state mismatch');
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/auth', url.origin));

  try {
    const redirectUri = `${url.origin}/api/whoop/callback`;
    const token = await exchangeWhoopCode(code, redirectUri);
    const expiresAt = new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString();
    const profile = (await whoopGet('/user/profile/basic', token.access_token).catch(() => null)) as {user_id?: number} | null;

    await sql`
      insert into whoop_accounts (user_id, whoop_user_id, access_token, refresh_token, expires_at)
      values (
        ${user.id},
        ${profile?.user_id ? String(profile.user_id) : null},
        ${token.access_token},
        ${token.refresh_token ?? null},
        ${expiresAt}
      )
      on conflict (user_id) do update set
        whoop_user_id = excluded.whoop_user_id,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        connected_at = now()`;

    const recovery = (await whoopGet('/recovery?limit=1', token.access_token).catch(() => null)) as {
      records?: {score?: {recovery_score?: number; resting_heart_rate?: number; hrv_rmssd_milli?: number}; created_at?: string}[];
    } | null;
    const rec = recovery?.records?.[0];
    const when = rec?.created_at ?? new Date().toISOString();
    const samples = [];
    if (rec?.score?.recovery_score != null) samples.push({metric: 'recovery_score', value: rec.score.recovery_score, unit: 'score', recordedAt: when});
    if (rec?.score?.resting_heart_rate != null) samples.push({metric: 'resting_hr', value: rec.score.resting_heart_rate, unit: 'bpm', recordedAt: when});
    if (rec?.score?.hrv_rmssd_milli != null) samples.push({metric: 'hrv_ms', value: rec.score.hrv_rmssd_milli, unit: 'ms', recordedAt: when});
    if (samples.length) await insertHealthSamples(user.id, 'whoop', samples);

    const res = NextResponse.redirect(new URL('/health?whoop=connected', url.origin));
    res.cookies.set('whoop_oauth_state', '', {path: '/', maxAge: 0});
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'whoop failed');
  }
}
