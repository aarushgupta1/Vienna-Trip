export interface GeocodeResult {
  lat: number;
  lng: number;
}

export interface GeocodeSuggestion extends GeocodeResult {
  displayName: string;
}

// The trip covers Vienna + Salzburg (Austria) and Prague (Czech Republic).
// Nominatim doesn't support biasing toward multiple disjoint cities in one
// query, so results are restricted at the country level instead — a close
// proxy for "these 3 cities" that still lets addresses/place names resolve
// correctly within any of them.
const TRIP_COUNTRY_CODES = 'at,cz';

// Nominatim (OpenStreetMap) — free, no API key, fair-use policy requires a
// descriptive User-Agent and caps usage at ~1 request/sec, which is fine here
// since this only runs when a family member actually saves a location.
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=${TRIP_COUNTRY_CODES}`,
      { headers: { 'User-Agent': 'vienna-trip-planner (family itinerary app)' } }
    );
    if (!res.ok) return null;

    const results = (await res.json()) as { lat: string; lon: string }[];
    if (results.length === 0) return null;

    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

// Powers the location autocomplete field — returns a handful of candidate
// places for a partial, in-progress query.
export async function searchLocations(query: string): Promise<GeocodeSuggestion[]> {
  if (query.trim().length < 3) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=${TRIP_COUNTRY_CODES}`,
      { headers: { 'User-Agent': 'vienna-trip-planner (family itinerary app)' } }
    );
    if (!res.ok) return [];

    const results = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return results.map((r) => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}
