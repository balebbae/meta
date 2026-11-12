/** Public origin for OAuth redirects: env wins (Vercel), else the request's own origin. */
export function appOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && !env.includes('localhost')) return env.replace(/\/$/, '');
  const fwdHost = req.headers.get('x-forwarded-host');
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  return new URL(req.url).origin;
}
