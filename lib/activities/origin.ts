/** Public origin for OAuth redirects: the host the user is actually on (custom domain or preview) wins, env is the fallback. */
export function appOrigin(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (fwdHost && !fwdHost.startsWith('localhost')) return `${fwdProto}://${fwdHost}`;
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  return new URL(req.url).origin;
}
