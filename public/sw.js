/* Facebook clone service worker: Web Push + minimal offline app shell. */
const CACHE = 'fb-shell-v2';
const SHELL = ['/', '/auth', '/manifest.webmanifest', '/pwa-192x192.png', '/pwa-512x512.png', '/apple-touch-icon.png', '/favicon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
  // Warm the app shell in the background so activation (and pushManager.subscribe) is not delayed.
  caches
    .open(CACHE)
    .then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
    .catch(() => {});
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && (req.mode === 'navigate' || SHELL.includes(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return new Response('Offline', {status: 503, headers: {'content-type': 'text/plain'}});
      }),
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {title: 'Facebook', body: event.data ? event.data.text() : ''};
  }
  const title = data.title || 'Facebook';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'fb',
    renotify: data.renotify !== false,
    silent: data.silent === true,
    data: {url: data.url || '/'},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
      const sameOrigin = list.filter(c => new URL(c.url).origin === self.location.origin);
      const exact = sameOrigin.find(c => c.url === target);
      const client = exact || sameOrigin[0];
      if (client) {
        return client.focus().then(c => (c && c.url !== target && 'navigate' in c ? c.navigate(target) : c));
      }
      return self.clients.openWindow(target);
    }),
  );
});
