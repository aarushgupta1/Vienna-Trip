import { describe, it, expect } from 'vitest';
import { getCityForDate, getCitiesForDate } from '@/lib/trip';

describe('getCityForDate', () => {
  it('returns the single city for an ordinary day', () => {
    expect(getCityForDate('2026-08-06')).toBe('Vienna');
    expect(getCityForDate('2026-08-13')).toBe('Prague');
  });

  it('returns Salzburg (the based-in city) for the Aug 10 day trip', () => {
    expect(getCityForDate('2026-08-10')).toBe('Salzburg');
  });
});

describe('getCitiesForDate', () => {
  it('returns a single-element array for an ordinary day', () => {
    expect(getCitiesForDate('2026-08-06')).toEqual(['Vienna']);
    expect(getCitiesForDate('2026-08-09')).toEqual(['Salzburg']);
  });

  it('returns both cities for Aug 10, ordered Vienna before Salzburg', () => {
    expect(getCitiesForDate('2026-08-10')).toEqual(['Vienna', 'Salzburg']);
  });

  it('does not return duplicate cities', () => {
    const cities = getCitiesForDate('2026-08-10');
    expect(new Set(cities).size).toBe(cities.length);
  });
});
