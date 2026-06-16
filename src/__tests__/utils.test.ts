import { describe, it, expect } from 'vitest';
import {
  generateTripDates,
  formatTime,
  formatDate,
  formatDateFull,
  TRIP_START,
  TRIP_END,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
describe('generateTripDates', () => {
  const dates = generateTripDates();

  it('returns 11 dates (Aug 6 through Aug 16 inclusive)', () => {
    expect(dates).toHaveLength(11);
  });

  it('starts on the trip start date', () => {
    expect(dates[0]).toBe(TRIP_START); // '2026-08-06'
  });

  it('ends on the trip end date', () => {
    expect(dates[dates.length - 1]).toBe(TRIP_END); // '2026-08-16'
  });

  it('each date is exactly one day after the previous', () => {
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T12:00:00Z');
      const curr = new Date(dates[i] + 'T12:00:00Z');
      expect(curr.getTime() - prev.getTime()).toBe(86_400_000); // 24 hours
    }
  });

  it('all entries are in YYYY-MM-DD format', () => {
    expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('formatTime', () => {
  it('formats a morning time correctly', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
  });

  it('formats an afternoon time correctly', () => {
    expect(formatTime('13:30')).toBe('1:30 PM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('formats midnight as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('pads single-digit minutes with a leading zero', () => {
    expect(formatTime('10:05')).toBe('10:05 AM');
  });

  it('handles the last minute of the day', () => {
    expect(formatTime('23:59')).toBe('11:59 PM');
  });
});

// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('returns the correct short weekday for 2026-08-06 (Thursday)', () => {
    const { weekday } = formatDate('2026-08-06');
    expect(weekday).toBe('Thu');
  });

  it('returns the numeric day without a month prefix', () => {
    const { monthDay } = formatDate('2026-08-06');
    expect(monthDay).toBe('6');
  });

  it('returns the correct weekday for the last trip day (2026-08-16, Sunday)', () => {
    const { weekday } = formatDate('2026-08-16');
    expect(weekday).toBe('Sun');
  });
});

// ---------------------------------------------------------------------------
describe('formatDateFull', () => {
  it('returns a full human-readable date string', () => {
    const result = formatDateFull('2026-08-06');
    expect(result).toContain('Thursday');
    expect(result).toContain('August');
    expect(result).toContain('6');
  });

  it('does not include the year', () => {
    // The function uses weekday + month + day, no year
    expect(formatDateFull('2026-08-06')).not.toContain('2026');
  });
});
