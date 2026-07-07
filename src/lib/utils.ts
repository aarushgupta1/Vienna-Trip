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
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
  },
  food: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-400',
  },
  landmark: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-400',
  },
  entertainment: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
  },
  other: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
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
