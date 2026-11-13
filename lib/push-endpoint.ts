/**
 * The server POSTs to whatever endpoint a browser registered, so only real push services are accepted;
 * anything else would let a user point the server at internal URLs (SSRF). Tests: push-endpoint.test.ts.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && !u.port && !u.username && PUSH_HOSTS.some(h => h.test(u.hostname));
  } catch {
    return false;
  }
}
