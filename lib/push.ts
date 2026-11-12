import webpush, {WebPushError, type PushSubscription} from 'web-push';
import {sql} from '@/lib/db';

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
export async function sendToSubscription(sub: StoredSubscription, payload: PushPayload): Promise<boolean> {
  if (!configure()) return false;
  const target: PushSubscription = {endpoint: sub.endpoint, keys: {p256dh: sub.p256dh, auth: sub.auth}};
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.tag ?? 'fb',
    icon: payload.icon ?? '/pwa-192x192.png',
  });
  try {
    await webpush.sendNotification(target, body, {TTL: 60 * 60, urgency: 'high'});
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

/**
 * Sends a Web Push notification to every subscription the user has registered.
 * Never throws: failures are logged and swallowed; expired subscriptions are removed.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  try {
    if (!configure()) return;
    const subs = await listSubscriptions(userId);
    if (subs.length === 0) return;
    await Promise.all(subs.map(sub => sendToSubscription(sub, payload)));
  } catch (err) {
    console.error('[push] sendPushToUser failed', err instanceof Error ? err.message : err);
  }
}
