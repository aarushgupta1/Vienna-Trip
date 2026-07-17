'use client';

import { useEffect, useState } from 'react';
import { savePushSubscription } from '@/app/actions';

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// PushManager wants the VAPID public key as a raw Uint8Array, not the
// base64url string it's normally handed around as — standard conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// Manages "does this device get event reminders" — permission plus the
// actual PushManager subscription that lets the server (see
// /api/send-event-reminders) wake this device with a notification even when
// the app isn't open. The subscribing itself only has to happen once per
// device; it's re-checked (not re-created) on every mount.
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const enable = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return; // Reminders aren't configured server-side yet.

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const json = subscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await savePushSubscription({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        });
      }
    } catch {
      // Subscribing can fail (browser quirks, no VAPID key configured, user
      // dismissed a native prompt) — permission state above already reflects
      // granted/denied, which is the only feedback surfaced for this today.
    }
  };

  return { permission, enable };
}
