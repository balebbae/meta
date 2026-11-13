import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {whoopAuthorizeUrl, whoopConfigured} from '@/lib/whoop';

export async function GET(req: Request) {
  if (!whoopConfigured()) {
    return NextResponse.json({error: 'WHOOP_CLIENT_ID is not set'}, {status: 503});
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/auth', req.url));

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/whoop/callback`;
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(whoopAuthorizeUrl(redirectUri, state));
  res.cookies.set('whoop_oauth_state', state, {httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https'), path: '/', maxAge: 600});
  return res;
}
