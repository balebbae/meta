/**
 * Public origin for OAuth redirects: the host the user is actually on (custom domain or preview) wins, env
 * is the fallback. Host headers are client-controlled, so only our own domain and Vercel previews are
 * trusted; anything else would turn OAuth redirects into an open redirect to an attacker's host.
 */
export function appOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  const fwdHost = (req.headers.get('x-forwarded-host') ?? req.headers.get('host'))?.split(',')[0].trim().toLowerCase();
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'http' ? 'http' : 'https';
  if (fwdHost && !fwdHost.startsWith('localhost') && trustedHost(fwdHost, env)) return `${proto}://${fwdHost}`;
  if (env) return env;
  return new URL(req.url).origin;
}

function trustedHost(host: string, env: string | undefined): boolean {
  if (!/^[a-z0-9.-]+(:\d+)?$/.test(host)) return false;
  let envHost: string | null = null;
  try {
    envHost = env ? new URL(env).host.toLowerCase() : null;
  } catch {
    envHost = null;
  }
  return host === envHost || host.endsWith('.vercel.app') || host.startsWith('127.0.0.1');
}
