// Plain (non-"use client") Vienna-time helpers — safe to import from both
// client components and server-only code (API routes, server actions). Kept
// separate from viennaClock.ts's React hook so the /api/send-event-reminders
// route can compute exactly the same "now" the calendar UI uses, without
// pulling React into a server route.

export interface ViennaNow {
  date: string; // YYYY-MM-DD, Vienna-local calendar date
  minutes: number; // minutes since midnight, Vienna-local time
}

// The calendar grid always represents Vienna wall-clock time regardless of
// the VIE/ET display toggle (see shiftTime in utils.ts), so "today", the
// current-time line, and event reminders all need the real Vienna-local
// clock, not the server's or browser's local timezone.
export function getViennaNow(): ViennaNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = Number(get('hour')) % 24; // Intl can render midnight as "24" with hour12: false
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + Number(get('minute')),
  };
}
