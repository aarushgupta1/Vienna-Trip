// The trip now spans three cities back-to-back within the same overall
// Aug 6–16, 2026 window (see TRIP_START/TRIP_END in utils.ts). This file is
// the single source of truth for which city a given calendar date belongs
// to, and the reference coordinates used for that city's weather/geocoding.
//
// Travel days (the day you check out of one hotel and into the next) are
// attributed to the destination city, since that's where the day is
// actually spent once you arrive.

export type TripCity = 'Vienna' | 'Salzburg' | 'Prague';

export const CITY_ORDER: TripCity[] = ['Vienna', 'Salzburg', 'Prague'];

export interface CitySegment {
  city: TripCity;
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
}

// Vienna Aug 6–9, Salzburg 9–12, Prague 12–16 (hotel check-in/check-out
// dates) — each transition day is counted as the arrival city below.
export const CITY_SEGMENTS: CitySegment[] = [
  { city: 'Vienna', start: '2026-08-06', end: '2026-08-08' },
  { city: 'Salzburg', start: '2026-08-09', end: '2026-08-11' },
  { city: 'Prague', start: '2026-08-12', end: '2026-08-16' },
];

export const CITY_INFO: Record<TripCity, { lat: number; lng: number; country: string; timezone: string; shortLabel: string }> = {
  Vienna: { lat: 48.2082, lng: 16.3738, country: 'Austria', timezone: 'Europe/Vienna', shortLabel: 'VIE' },
  Salzburg: { lat: 47.8095, lng: 13.0550, country: 'Austria', timezone: 'Europe/Vienna', shortLabel: 'SLZ' },
  Prague: { lat: 50.0755, lng: 14.4378, country: 'Czech Republic', timezone: 'Europe/Prague', shortLabel: 'PRG' },
};

// Small color accent per city, used for the day-header city badge — kept
// visually distinct from the (unrelated) event-category colors.
export const CITY_COLORS: Record<TripCity, { text: string; bg: string; dot: string }> = {
  Vienna: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', dot: 'bg-blue-400' },
  Salzburg: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', dot: 'bg-emerald-400' },
  Prague: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50', dot: 'bg-purple-400' },
};

export function getCityForDate(date: string): TripCity {
  const seg = CITY_SEGMENTS.find((s) => date >= s.start && date <= s.end);
  return seg ? seg.city : CITY_SEGMENTS[CITY_SEGMENTS.length - 1].city;
}
