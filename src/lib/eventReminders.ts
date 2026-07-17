// Superseded by src/lib/pushNotifications.ts: event reminders now fire via
// real Web Push (server-sent, delivered even when the app is closed) instead
// of this file's old client-side "check every minute while the tab is open"
// timer — keeping both would double-fire notifications. This file's own
// deletion isn't permitted in this workspace, so it's left as a pointer
// rather than dead code with the old (now-removed) implementation in it.
// Use `usePushNotifications` from './pushNotifications' instead.
export { getNotificationPermission } from './pushNotifications';
export type { NotificationPermissionState } from './pushNotifications';
