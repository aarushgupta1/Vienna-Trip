export interface GeocodeResult {
  lat: number;
  lng: number;
}

// Nominatim (OpenStreetMap) — free, no API key, fair-use policy requires a
// descriptive User-Agent and caps usage at ~1 request/sec, which is fine here
// since this only runs when a family member actually saves a location.
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const query = /vienna|wien|austria|österreich/i.test(address)
    ? address
    : `${address}, Vienna, Austria`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
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
