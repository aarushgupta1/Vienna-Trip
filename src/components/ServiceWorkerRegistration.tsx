'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Caching in dev fights the dev server's live recompilation — a cached
    // HTML/JS pairing can go stale mid-edit and hydrate mismatched. Only run
    // the service worker against production builds, and clean up any
    // registration + caches left over from earlier dev sessions.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(console.error);
  }, []);

  return null;
}
