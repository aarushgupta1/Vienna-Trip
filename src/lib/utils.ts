import { Category, LogisticsPinCategory } from './types';

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
  other: 'Other',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  museum: '🏛️',
  food: '🍽️',
  landmark: '🏰',
  entertainment: '🎭',
  other: '📍',
};

export const LOGISTICS_CATEGORY_ORDER: LogisticsPinCategory[] = [
  'flights',
  'accommodation',
  'transport',
  'documents',
  'contacts',
  'budget',
  'other',
];

export const PIN_CATEGORY_META: Record<
  LogisticsPinCategory,
  { label: string; icon: string; bg: string; text: string; border: string; badge: string }
> = {
  flights: {
    label: 'Flights',
    icon: '✈️',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
  },
  accommodation: {
    label: 'Hotels',
    icon: '🏨',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
  },
  transport: {
    label: 'Transport',
    icon: '🚆',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  documents: {
    label: 'Documents',
    icon: '📄',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  },
  contacts: {
    label: 'Contacts',
    icon: '📞',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
  },
  budget: {
    label: 'Budget',
    icon: '💰',
    bg: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300',
  },
  other: {
    label: 'Other',
    icon: '📌',
    bg: 'bg-gray-50 dark:bg-gray-800/40',
    text: 'text-gray-600 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
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

export function buildGCalUrl(name: string, date: string, startTime: string, endTime: string, description: string): string {
  const d = date.replace(/-/g, '');
  let dates: string;
  if (startTime) {
    const start = `${d}T${startTime.replace(':', '')}00`;
    const end = endTime ? `${d}T${endTime.replace(':', '')}00` : start;
    dates = `${start}/${end}`;
  } else {
    const nextDay = new Date(date + 'T12:00:00Z');
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    dates = `${d}/${nextDay.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }
  const params = new URLSearchParams({ action: 'TEMPLATE', text: name, dates, location: 'Vienna, Austria', ctz: 'Europe/Vienna' });
  if (description) params.set('details', description);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}
