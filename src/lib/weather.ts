import { CITY_INFO, TripCity, CITY_ORDER, getCitiesForDate } from './trip';

export interface DayWeather {
  city: TripCity;
  high: number; // °F
  low: number; // °F
  code: number; // WMO weather code
  isForecast: boolean; // true = actual forecast, false = historical average for the date
}

interface DailyBlock {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weathercode: number[];
}

// A date normally belongs to a single city, but a day-trip day (see
// CITY_SEGMENTS in trip.ts) can belong to more than one — so weather is
// fetched per (date, city) pair, and a date can map to more than one
// DayWeather entry.
export async function getWeatherForDates(dates: string[]): Promise<Record<string, DayWeather[]>> {
  const result: Record<string, DayWeather[]> = {};
  if (dates.length === 0) return result;

  const pairs = dates.flatMap((d) => getCitiesForDate(d).map((city) => ({ date: d, city })));

  const byCity = new Map<TripCity, string[]>();
  for (const { date, city } of pairs) {
    byCity.set(city, [...(byCity.get(city) ?? []), date]);
  }

  const found = new Set<string>(); // `${date}|${city}`

  await Promise.all(
    [...byCity.entries()].map(async ([city, cityDates]) => {
      const { lat, lng, timezone } = CITY_INFO[city];
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
            `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=${encodeURIComponent(timezone)}&forecast_days=16&temperature_unit=fahrenheit`,
          { next: { revalidate: 1800 } }
        );
        if (res.ok) {
          const data = (await res.json()) as { daily?: DailyBlock };
          const daily = data.daily;
          daily?.time.forEach((day, i) => {
            if (cityDates.includes(day)) {
              (result[day] ??= []).push({
                city,
                high: Math.round(daily.temperature_2m_max[i]),
                low: Math.round(daily.temperature_2m_min[i]),
                code: daily.weathercode[i],
                isForecast: true,
              });
              found.add(`${day}|${city}`);
            }
          });
        }
      } catch {
        // Forecast unavailable for this city — its dates fall through to
        // historical averages below.
      }
    })
  );

  const missingPairs = pairs.filter(({ date, city }) => !found.has(`${date}|${city}`));
  if (missingPairs.length > 0) {
    await fillHistoricalAverages(missingPairs, result);
  }

  // Deterministic order (Vienna before Salzburg before Prague) regardless of
  // which city's fetch happened to resolve first above.
  for (const date of Object.keys(result)) {
    result[date].sort((a, b) => CITY_ORDER.indexOf(a.city) - CITY_ORDER.indexOf(b.city));
  }

  return result;
}

// Dates outside the 16-day forecast window (e.g. a trip planned months out) get
// a "typical weather" estimate instead: the average of the last 10 years of
// actual observations for that calendar day, pulled from Open-Meteo's archive.
// Each city's dates are queried against that city's own coordinates. Mutates
// `result` in place (pushing onto each date's array) rather than returning a
// fresh object, since a date may already have another city's entry in it.
async function fillHistoricalAverages(
  pairs: { date: string; city: TripCity }[],
  result: Record<string, DayWeather[]>
): Promise<void> {
  const byCity = new Map<TripCity, string[]>();
  for (const { date, city } of pairs) {
    byCity.set(city, [...(byCity.get(city) ?? []), date]);
  }

  await Promise.all(
    [...byCity.entries()].map(async ([city, cityDates]) => {
      const cityResult = await getHistoricalAveragesForCity(city, cityDates);
      for (const date of cityDates) {
        const entry = cityResult[date];
        if (entry) (result[date] ??= []).push(entry);
      }
    })
  );
}

async function getHistoricalAveragesForCity(city: TripCity, dates: string[]): Promise<Record<string, DayWeather>> {
  const result: Record<string, DayWeather> = {};
  const { lat, lng, timezone } = CITY_INFO[city];

  const sorted = [...dates].sort();
  const [, startMonth, startDay] = sorted[0].split('-');
  const [, endMonth, endDay] = sorted[sorted.length - 1].split('-');

  const currentYear = new Date().getUTCFullYear();
  const YEARS_OF_HISTORY = 10;
  const years = Array.from({ length: YEARS_OF_HISTORY }, (_, i) => currentYear - 1 - i);

  const samplesByMonthDay = new Map<string, { high: number; low: number; code: number }[]>();

  await Promise.all(
    years.map(async (year) => {
      const start = `${year}-${startMonth}-${startDay}`;
      const end = `${year}-${endMonth}-${endDay}`;
      try {
        const res = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
            `&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=${encodeURIComponent(timezone)}&temperature_unit=fahrenheit`,
          { next: { revalidate: 60 * 60 * 24 } }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { daily?: DailyBlock };
        data.daily?.time.forEach((day, i) => {
          const high = data.daily!.temperature_2m_max[i];
          const low = data.daily!.temperature_2m_min[i];
          const code = data.daily!.weathercode[i];
          if (high == null || low == null || code == null) return;
          const monthDay = day.slice(5); // MM-DD
          const list = samplesByMonthDay.get(monthDay) ?? [];
          list.push({ high, low, code });
          samplesByMonthDay.set(monthDay, list);
        });
      } catch {
        // Skip years the archive can't serve; the average just uses fewer samples.
      }
    })
  );

  for (const date of dates) {
    const samples = samplesByMonthDay.get(date.slice(5));
    if (!samples || samples.length === 0) continue;

    const avg = (key: 'high' | 'low') =>
      samples.reduce((sum, s) => sum + s[key], 0) / samples.length;

    const codeCounts = new Map<number, number>();
    samples.forEach((s) => codeCounts.set(s.code, (codeCounts.get(s.code) ?? 0) + 1));
    const mostCommonCode = [...codeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    result[date] = {
      city,
      high: Math.round(avg('high')),
      low: Math.round(avg('low')),
      code: mostCommonCode,
      isForecast: false,
    };
  }

  return result;
}

// WMO weather interpretation codes: https://open-meteo.com/en/docs
export function weatherCodeInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Clear' };
  if (code === 1) return { icon: '🌤️', label: 'Mostly clear' };
  if (code === 2) return { icon: '⛅', label: 'Partly cloudy' };
  if (code === 3) return { icon: '☁️', label: 'Overcast' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Fog' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: 'Showers' };
  if (code === 85 || code === 86) return { icon: '🌨️', label: 'Snow showers' };
  if (code >= 95) return { icon: '⛈️', label: 'Storm' };
  return { icon: '🌡️', label: 'Unknown' };
}
