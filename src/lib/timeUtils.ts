import { Attraction } from './types';

export const PIXELS_PER_HOUR = 64;
export const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
export const GRID_START_HOUR = 7; // 7am
export const GRID_END_HOUR = 23; // 11pm
export const SLOT_MINUTES = 30;
export const DAYS_PER_PAGE = 4;
export const DEFAULT_DURATION_MINUTES = 60;

export const DAY_HEADER_HEIGHT = 52; // px
export const ANYTIME_ZONE_HEIGHT = 52; // px

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(GRID_START_HOUR * 60, Math.min(totalMinutes, (GRID_END_HOUR - 1) * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getEventTop(startTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  return Math.max(0, startMinutes - GRID_START_HOUR * 60) * PIXELS_PER_MINUTE;
}

export function getEventHeight(startTime: string, endTime: string | null): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = endTime
    ? Math.min(timeToMinutes(endTime), GRID_END_HOUR * 60)
    : Math.min(startMinutes + DEFAULT_DURATION_MINUTES, GRID_END_HOUR * 60);
  return Math.max(endMinutes - startMinutes, 15) * PIXELS_PER_MINUTE;
}

export function getDuration(startTime: string, endTime: string | null): number {
  if (!endTime) return DEFAULT_DURATION_MINUTES;
  return Math.max(timeToMinutes(endTime) - timeToMinutes(startTime), 15);
}

export function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}${ampm}`;
}

export function findTimeConflict(
  attractions: Attraction[],
  date: string,
  startTime: string,
  endTime: string | null,
  excludeId?: string
): Attraction | null {
  const newStart = timeToMinutes(startTime);
  const newEnd = endTime ? timeToMinutes(endTime) : newStart + DEFAULT_DURATION_MINUTES;
  return attractions.find((a) => {
    if (a.id === excludeId) return false;
    if (a.scheduled_date !== date) return false;
    if (!a.start_time) return false;
    const aStart = timeToMinutes(a.start_time);
    const aEnd = a.end_time ? timeToMinutes(a.end_time) : aStart + DEFAULT_DURATION_MINUTES;
    return newStart < aEnd && newEnd > aStart;
  }) ?? null;
}

export function generateTimeSlots(date: string): Array<{ id: string; top: number }> {
  const slots: Array<{ id: string; top: number }> = [];
  for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) {
    for (let min = 0; min < 60; min += SLOT_MINUTES) {
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const top = (hour - GRID_START_HOUR) * PIXELS_PER_HOUR + min * PIXELS_PER_MINUTE;
      slots.push({ id: `${date}T${time}`, top });
    }
  }
  return slots;
}
