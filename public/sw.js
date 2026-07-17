// Bump this string whenever you deploy significant changes so old caches are cleared.
const CACHE_NAME = 'vienna-trip-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Real Web Push from /api/send-event-reminders — this is what lets a
// "starts in 30 min" reminder show up even if the app isn't open at all.
// Payload shape: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  let payload = { title: 'Vienna Trip', body: 'An event is starting soon.', tag: 'event-reminder', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Fall back to the defaults above if the payload isn't valid JSON.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icon.svg',
      data: { url: payload.url },
    })
  );
});

// Tapping a "starts in 30 min" event reminder focuses the app if it's already
// open in a tab, or opens a new one otherwise.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests over http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Don't cache Supabase API calls — always go live when possible
  if (url.hostname.includes('supabase.co')) return;

  // _next/static assets have content hashes — cache first, they never change
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation requests and everything else: network first, serve cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
