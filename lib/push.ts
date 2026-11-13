import webpush, {WebPushError, type PushSubscription} from 'web-push';
import {sql} from '@/lib/db';
import {isPushEndpoint} from '@/lib/push-endpoint';
import {pushDecision} from '@/lib/push-policy';

/** Local hour for quiet hours, only when QUIET_HOURS_TZ (e.g. America/Chicago) is set; null = no quiet hours.
 * shortcut: one timezone for everyone, use a per-user timezone once one is stored. */
function quietHour(now: number): number | null {
  const tz = process.env.QUIET_HOURS_TZ;
  if (!tz) return null;
  try {
    return Number(new Intl.DateTimeFormat('en-US', {timeZone: tz, hour: 'numeric', hourCycle: 'h23'}).format(now));
  } catch {
    return null;
  }
}

export {isPushEndpoint};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export type StoredSubscription = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys missing; push disabled');
    return false;
  }
  const subject = process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_APP_URL ?? 'mailto:admin@example.com';
  webpush.setVapidDetails(subject.startsWith('http') || subject.startsWith('mailto:') ? subject : `mailto:${subject}`, publicKey, privateKey);
  configured = true;
  return true;
}

export async function listSubscriptions(userId: number): Promise<StoredSubscription[]> {
  const rows = await sql`select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}`;
  return rows as StoredSubscription[];
}

/** Sends one notification; returns false when the subscription is gone (404/410) and was deleted. */
export async function sendToSubscription(
  sub: StoredSubscription,
  payload: PushPayload,
  how: {urgency: 'high' | 'low'; silent: boolean; renotify: boolean} = {urgency: 'high', silent: false, renotify: true},
): Promise<boolean> {
  if (!configure()) return false;
  if (!isPushEndpoint(sub.endpoint)) return false;
  const target: PushSubscription = {endpoint: sub.endpoint, keys: {p256dh: sub.p256dh, auth: sub.auth}};
  const tag = payload.tag ?? 'fb';
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag,
    icon: payload.icon ?? '/pwa-192x192.png',
    silent: how.silent,
    renotify: how.renotify,
  });
  try {
    // topic: the push service keeps only the newest undelivered message per tag
    await webpush.sendNotification(target, body, {TTL: 60 * 60, urgency: how.urgency, topic: tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined});
    return true;
  } catch (err) {
    const status = err instanceof WebPushError ? err.statusCode : undefined;
    if (status === 404 || status === 410) {
      await sql`delete from push_subscriptions where endpoint = ${sub.endpoint}`.catch(() => {});
      return false;
    }
    console.error('[push] send failed', status ?? '', err instanceof Error ? err.message : err);
    return false;
  }
}

/** shortcut: per-instance memory, so serverless instances collapse independently; move to a column if bursts slip through. */
const lastSent = new Map<string, number>();

/**
 * Sends a Web Push notification to every subscription the user has registered, subject to pushDecision (collapse window
 * per recipient + tag, quiet hours in server time since users have no stored timezone).
 * Never throws: failures are logged and swallowed; expired subscriptions are removed.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  try {
    if (!configure()) return;
    const key = `${userId}:${payload.tag ?? 'fb'}`;
    const now = Date.now();
    const how = pushDecision(payload.tag ?? 'fb', lastSent.get(key), now, quietHour(now));
    if (!how.send) return;
    const subs = await listSubscriptions(userId);
    if (subs.length === 0) return;
    if (lastSent.size > 10_000) lastSent.clear();
    lastSent.set(key, now);
    await Promise.all(subs.map(sub => sendToSubscription(sub, payload, how)));
  } catch (err) {
    console.error('[push] sendPushToUser failed', err instanceof Error ? err.message : err);
  }
}
