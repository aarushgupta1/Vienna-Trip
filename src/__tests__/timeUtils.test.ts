import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  getEventTop,
  getEventHeight,
  getDuration,
  findTimeConflict,
  generateTimeSlots,
  PIXELS_PER_HOUR,
  PIXELS_PER_MINUTE,
  GRID_START_HOUR,
  GRID_END_HOUR,
  DEFAULT_DURATION_MINUTES,
} from '@/lib/timeUtils';
import type { Attraction } from '@/lib/types';

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: 'a1',
    name: 'Test',
    description: null,
    category: 'other',
    scheduled_date: '2026-08-06',
    start_time: '10:00',
    end_time: '11:00',
    notes: null,
    location: null,
    lat: null,
    lng: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
describe('timeToMinutes', () => {
  it('converts midnight to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts 7am to 420', () => {
    expect(timeToMinutes('07:00')).toBe(420);
  });

  it('converts 10:30 to 630', () => {
    expect(timeToMinutes('10:30')).toBe(630);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

// ---------------------------------------------------------------------------
describe('minutesToTime', () => {
  it('converts grid start (7am = 420 min) to 07:00', () => {
    expect(minutesToTime(420)).toBe('07:00');
  });

  it('converts 750 min to 12:30', () => {
    expect(minutesToTime(750)).toBe('12:30');
  });

  it('pads single-digit minutes to two digits', () => {
    expect(minutesToTime(425)).toBe('07:05');
  });

  it('clamps values below grid start to 07:00', () => {
    expect(minutesToTime(0)).toBe('07:00');
    expect(minutesToTime(300)).toBe('07:00');
  });

  it('clamps values above grid end to 22:59', () => {
    const max = (GRID_END_HOUR - 1) * 60 + 59; // 22:59
    expect(minutesToTime(max + 100)).toBe('22:59');
  });
});

// ---------------------------------------------------------------------------
describe('getEventTop', () => {
  it('returns 0 for an event starting at grid start (7am)', () => {
    expect(getEventTop('07:00')).toBe(0);
  });

  it('returns PIXELS_PER_HOUR for an event starting at 8am', () => {
    expect(getEventTop('08:00')).toBe(PIXELS_PER_HOUR);
  });

  it('returns correct offset for a half-hour mark', () => {
    // 9:30 = 2.5 hours past grid start
    expect(getEventTop('09:30')).toBe(2.5 * PIXELS_PER_HOUR);
  });
});

// ---------------------------------------------------------------------------
describe('getEventHeight', () => {
  it('returns PIXELS_PER_HOUR for a 60-minute event', () => {
    expect(getEventHeight('10:00', '11:00')).toBe(PIXELS_PER_HOUR);
  });

  it('returns half PIXELS_PER_HOUR for a 30-minute event', () => {
    expect(getEventHeight('10:00', '10:30')).toBe(PIXELS_PER_HOUR / 2);
  });

  it('uses DEFAULT_DURATION_MINUTES when end time is null', () => {
    expect(getEventHeight('10:00', null)).toBe(DEFAULT_DURATION_MINUTES * PIXELS_PER_MINUTE);
  });

  it('enforces a minimum height of 15 minutes when start equals end', () => {
    expect(getEventHeight('10:00', '10:00')).toBe(15 * PIXELS_PER_MINUTE);
  });

  it('clamps end time to GRID_END_HOUR when event runs over', () => {
    // 22:30 → 23:30, but grid ends at 23:00 (1380 min)
    const height = getEventHeight('22:30', '23:30');
    const expected = (GRID_END_HOUR * 60 - timeToMinutes('22:30')) * PIXELS_PER_MINUTE;
    expect(height).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
describe('getDuration', () => {
  it('returns correct minute difference for a 60-minute span', () => {
    expect(getDuration('10:00', '11:00')).toBe(60);
  });

  it('returns DEFAULT_DURATION_MINUTES when end time is null', () => {
    expect(getDuration('10:00', null)).toBe(DEFAULT_DURATION_MINUTES);
  });

  it('enforces a minimum of 15 minutes for very short or reversed spans', () => {
    expect(getDuration('10:00', '10:05')).toBe(15);
    expect(getDuration('11:00', '10:00')).toBe(15); // reversed
  });
});

// ---------------------------------------------------------------------------
describe('findTimeConflict', () => {
  it('returns null when the attractions list is empty', () => {
    expect(findTimeConflict([], '2026-08-06', '10:00', '11:00')).toBeNull();
  });

  it('returns null when existing event is on a different date', () => {
    const existing = makeAttraction({ scheduled_date: '2026-08-07' });
    expect(findTimeConflict([existing], '2026-08-06', '10:00', '11:00')).toBeNull();
  });

  it('returns null when events do not overlap', () => {
    const existing = makeAttraction({ start_time: '10:00', end_time: '11:00' });
    expect(findTimeConflict([existing], '2026-08-06', '11:00', '12:00')).toBeNull();
    expect(findTimeConflict([existing], '2026-08-06', '08:00', '10:00')).toBeNull();
  });

  it('returns null for events that touch exactly at a boundary (no overlap)', () => {
    const existing = makeAttraction({ start_time: '10:00', end_time: '11:00' });
    // New event ends exactly when existing starts
    expect(findTimeConflict([existing], '2026-08-06', '09:00', '10:00')).toBeNull();
    // New event starts exactly when existing ends
    expect(findTimeConflict([existing], '2026-08-06', '11:00', '12:00')).toBeNull();
  });

  it('returns the conflicting attraction when times overlap', () => {
    const existing = makeAttraction({ start_time: '10:00', end_time: '11:00' });
    expect(findTimeConflict([existing], '2026-08-06', '10:30', '11:30')).toBe(existing);
    expect(findTimeConflict([existing], '2026-08-06', '09:30', '10:30')).toBe(existing);
    expect(findTimeConflict([existing], '2026-08-06', '10:00', '11:00')).toBe(existing);
  });

  it('returns conflict when new event fully contains an existing event', () => {
    const existing = makeAttraction({ start_time: '10:00', end_time: '11:00' });
    expect(findTimeConflict([existing], '2026-08-06', '09:00', '12:00')).toBe(existing);
  });

  it('returns null when the conflicting event is excluded by id', () => {
    const existing = makeAttraction({ id: 'self', start_time: '10:00', end_time: '11:00' });
    expect(findTimeConflict([existing], '2026-08-06', '10:00', '11:00', 'self')).toBeNull();
  });

  it('returns null when existing event has no start_time', () => {
    const unscheduled = makeAttraction({ start_time: null, end_time: null });
    expect(findTimeConflict([unscheduled], '2026-08-06', '10:00', '11:00')).toBeNull();
  });

  it('uses DEFAULT_DURATION_MINUTES for existing event with null end time', () => {
    const existing = makeAttraction({ start_time: '10:00', end_time: null });
    // Existing runs 10:00–11:00 by default; new event at 10:30 overlaps
    expect(findTimeConflict([existing], '2026-08-06', '10:30', '11:30')).toBe(existing);
    // New event at 11:00 does not overlap
    expect(findTimeConflict([existing], '2026-08-06', '11:00', '12:00')).toBeNull();
  });

  it('uses DEFAULT_DURATION_MINUTES when new event endTime is null', () => {
    const existing = makeAttraction({ start_time: '10:30', end_time: '11:30' });
    // New event at 10:00 with null end → runs 10:00–11:00, overlaps existing
    expect(findTimeConflict([existing], '2026-08-06', '10:00', null)).toBe(existing);
    // New event at 09:00 with null end → runs 09:00–10:00, no overlap
    expect(findTimeConflict([existing], '2026-08-06', '09:00', null)).toBeNull();
  });

  it('returns the first conflict when multiple events exist', () => {
    const a = makeAttraction({ id: 'a', start_time: '09:00', end_time: '10:00' });
    const b = makeAttraction({ id: 'b', start_time: '11:00', end_time: '12:00' });
    // New event spans both — finds a first
    expect(findTimeConflict([a, b], '2026-08-06', '09:30', '11:30')).toBe(a);
  });
});

// ---------------------------------------------------------------------------
describe('generateTimeSlots', () => {
  const DATE = '2026-08-06';
  const slots = generateTimeSlots(DATE);
  const EXPECTED_COUNT = (GRID_END_HOUR - GRID_START_HOUR) * 2; // 32

  it('generates the correct number of 30-minute slots', () => {
    expect(slots).toHaveLength(EXPECTED_COUNT);
  });

  it('first slot is at 07:00 with top = 0', () => {
    expect(slots[0]).toEqual({ id: `${DATE}T07:00`, top: 0 });
  });

  it('second slot is at 07:30 with top = PIXELS_PER_HOUR / 2', () => {
    expect(slots[1]).toEqual({ id: `${DATE}T07:30`, top: PIXELS_PER_HOUR / 2 });
  });

  it('every slot id includes the date prefix', () => {
    expect(slots.every((s) => s.id.startsWith(DATE))).toBe(true);
  });

  it('top values increase monotonically', () => {
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].top).toBeGreaterThan(slots[i - 1].top);
    }
  });
});
