'use client';

import { useEffect, useState } from 'react';
import { savePushSubscription, deletePushSubscription } from '@/app/actions';

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

// Manages "does this device get event reminders" — browser permission, plus
// whether this device is *currently* subscribed. Those are separate: once a
// site is granted notification permission, the browser has no API to revoke
// it from JS again, so "turning alerts off" is instead modeled as
// unsubscribing from PushManager and deleting the row server-side that
// /api/send-event-reminders sends to — permission can stay "granted" while
// subscribed is false, and re-enabling just re-subscribes without asking for
// permission again.
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const current = getNotificationPermission();
    setPermission(current);
    if (current !== 'granted' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(!!subscription))
      .catch(() => {});
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
        setSubscribed(true);
      }
    } catch {
      // Subscribing can fail (browser quirks, no VAPID key configured, user
      // dismissed a native prompt) — permission state above already reflects
      // granted/denied, which is the only feedback surfaced for this today.
    }
  };

  const disable = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setSubscribed(false);
        return;
      }
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await deletePushSubscription(endpoint);
    } catch {
      // Best-effort — even if the server-side delete fails, the local
      // unsubscribe (if it succeeded) already stops this device asking for
      // pushes, so it's still reflected as off below.
    } finally {
      setSubscribed(false);
    }
  };

  return { permission, subscribed, enable, disable };
}
