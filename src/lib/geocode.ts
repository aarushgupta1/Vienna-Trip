export interface GeocodeResult {
  lat: number;
  lng: number;
}

export interface GeocodeSuggestion extends GeocodeResult {
  displayName: string;
}

function buildViennaQuery(address: string): string {
  return /vienna|wien|austria|österreich/i.test(address)
    ? address
    : `${address}, Vienna, Austria`;
}

// Nominatim (OpenStreetMap) — free, no API key, fair-use policy requires a
// descriptive User-Agent and caps usage at ~1 request/sec, which is fine here
// since this only runs when a family member actually saves a location.
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(buildViennaQuery(address))}&format=json&limit=1`,
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
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(buildViennaQuery(query))}&format=json&limit=5`,
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
