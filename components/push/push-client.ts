/** Browser-side helpers for Web Push. Safe to import from client components only. */

export type PushStatus = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'prompt' | 'subscribed' | 'unsubscribed';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone === true;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** iOS Safari only exposes push to installed (Home Screen) web apps. */
export function needsInstall(): boolean {
  return isIos() && !isStandalone();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    await navigator.serviceWorker.register('/sw.js', {scope: '/'});
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('[push] service worker registration failed', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function vapidPublicKey(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  const res = await fetch('/api/push/vapid-public-key');
  const data = (await res.json()) as {publicKey: string | null};
  if (!data.publicKey) throw new Error('VAPID public key not configured');
  return data.publicKey;
}

export async function currentStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return needsInstall() ? 'needs-install' : 'unsupported';
  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';
  if (permission === 'default') return 'prompt';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'subscribed' : 'unsubscribed';
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({subscription: sub.toJSON()}),
  });
  if (!res.ok) throw new Error(`subscribe failed (${res.status})`);
}

/** Requests permission (if needed), subscribes with the server key and stores the subscription. */
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return needsInstall() ? 'needs-install' : 'unsupported';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'prompt';
  const reg = await registerServiceWorker();
  if (!reg) return 'unsupported';
  const key = urlBase64ToUint8Array(await vapidPublicKey());
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key});
  await saveSubscription(sub);
  return 'subscribed';
}

/** If permission is already granted, make sure this browser's subscription is stored for the current user. */
export async function syncExistingSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await saveSubscription(sub).catch(() => {});
}

export async function disablePush(): Promise<PushStatus> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({endpoint: sub.endpoint}),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return Notification.permission === 'granted' ? 'unsubscribed' : 'prompt';
}

export async function sendTestPush(): Promise<{ok: boolean; sent: number; error?: string}> {
  const res = await fetch('/api/push/test', {method: 'POST'});
  return (await res.json()) as {ok: boolean; sent: number; error?: string};
}

export const promptDecidedKey = (userId: number) => `fb.push.prompt.${userId}`;
