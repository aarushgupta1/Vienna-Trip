import { Category } from './types';

export const TRIP_START = '2026-08-06';
export const TRIP_END = '2026-08-16';

export function generateTripDates(): string[] {
  const dates: string[] = [];
  const start = new Date(TRIP_START + 'T12:00:00Z');
  const end = new Date(TRIP_END + 'T12:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; dot: string }> = {
  museum: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-400',
  },
  food: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-400',
  },
  landmark: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-400',
  },
  entertainment: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-400',
  },
  flights: {
    bg: 'bg-sky-50 dark:bg-sky-950',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-400',
  },
  travel: {
    bg: 'bg-teal-50 dark:bg-teal-950',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    dot: 'bg-teal-400',
  },
  other: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400',
  },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  museum: 'Museum',
  food: 'Food & Dining',
  landmark: 'Landmark',
  entertainment: 'Entertainment',
  flights: 'Flight',
  travel: 'Travel',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  museum: '🏛️',
  food: '🍽️',
  landmark: '🏰',
  entertainment: '🎭',
  flights: '✈️',
  travel: '🚆',
  other: '📍',
};

export function formatDate(dateStr: string): { weekday: string; monthDay: string } {
  const date = new Date(dateStr + 'T12:00:00Z');
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    monthDay: date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
  };
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Compact "Aug 6" form — used where formatDateFull's "Wednesday, August 6"
// would be too long (e.g. a hotel's check-in/check-out range on a card).
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Rough "how long ago" phrasing — used for the offline banner's "last
// synced" note and for "last edited by ___" attribution. Doesn't need to be
// precise to the second, just give a sense of scale.
export function timeAgo(ms: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export type CalendarTimezone = 'vienna' | 'eastern';

// Trip events are stored and edited in Vienna local time; this is how far
// behind US Eastern runs during the trip (CEST UTC+2 vs EDT UTC-4 in August).
export const EASTERN_OFFSET_HOURS = -6;

// Shifts a stored "HH:MM" (always Vienna time) into the given display
// timezone, for showing events on the calendar — never for editing/saving.
export function shiftTime(timeStr: string, timezone: CalendarTimezone): string {
  if (timezone !== 'eastern') return timeStr;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const shifted = ((hours + EASTERN_OFFSET_HOURS) % 24 + 24) % 24;
  return `${String(shifted).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatTimeInZone(timeStr: string, timezone: CalendarTimezone): string {
  return formatTime(shiftTime(timeStr, timezone));
}

// Google's "universal" maps link — works cross-platform (opens the native
// Maps app on iOS/Android when installed, falls back to Google Maps on the
// web otherwise). Uses the directions action with no origin specified, which
// makes Google Maps default the starting point to the user's current
// location (prompting for location access/a starting point if it isn't
// available) rather than just centering on the destination. Prefers the
// geocoded coordinates; falls back to the raw address text if geocoding
// hasn't produced lat/lng for some reason.
export function getMapsUrl(a: { lat: number | null; lng: number | null; location: string | null }): string | null {
  if (a.lat != null && a.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`;
  }
  if (a.location) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.location)}`;
  }
  return null;
}
