import { Attraction } from './types';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

export type TravelMode = 'walk' | 'bus' | 'drive' | 'train';

export interface TravelSegment {
  distanceMeters: number;
  driveMinutes: number | null; // real routed estimate (OSRM); null if routing failed
  walkMinutes: number; // estimated — see note below
  busMinutes: number; // estimated — see note below
  trainMinutes: number; // estimated — see note below
}

interface Coord {
  lat: number;
  lng: number;
}

function haversineMeters(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// OSRM's free public demo server only actually hosts the driving (car) road
// network — its "foot"/"bike" profile names are accepted but silently routed
// through the same car graph at car speeds, so they can't be trusted for a
// real walking time. Only the driving route is genuinely routed; walk/bus/
// train times below are all speed-based estimates derived from that real
// road distance.
async function fetchDrivingRoute(
  from: Coord,
  to: Coord
): Promise<{ distanceMeters: number; durationSeconds: number } | null> {
  try {
    const url = `${OSRM_BASE}/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return { distanceMeters: route.distance, durationSeconds: route.duration };
  } catch {
    return null;
  }
}

// Typical average speeds (including stops/lights/waiting), used to turn the
// real road distance into honest time estimates for the other modes.
const WALK_AVG_KMH = 4.8;
const BUS_AVG_KMH = 16;
const BUS_OVERHEAD_MIN = 6;
const TRAIN_AVG_KMH = 28;
const TRAIN_OVERHEAD_MIN = 8;

// Computes one segment per pair of chronologically back-to-back, timed,
// geocoded attractions on the same day — e.g. event 2 follows event 1.
export async function getTravelSegments(
  attractions: Attraction[]
): Promise<Record<string, TravelSegment>> {
  const byDate = new Map<string, Attraction[]>();
  for (const a of attractions) {
    if (!a.scheduled_date || !a.start_time || a.lat == null || a.lng == null) continue;
    const list = byDate.get(a.scheduled_date) ?? [];
    list.push(a);
    byDate.set(a.scheduled_date, list);
  }

  const pairs: [Attraction, Attraction][] = [];
  for (const list of byDate.values()) {
    list.sort((x, y) => x.start_time!.localeCompare(y.start_time!));
    for (let i = 0; i < list.length - 1; i++) {
      pairs.push([list[i], list[i + 1]]);
    }
  }

  const result: Record<string, TravelSegment> = {};

  await Promise.all(
    pairs.map(async ([from, to]) => {
      const fromCoord = { lat: from.lat!, lng: from.lng! };
      const toCoord = { lat: to.lat!, lng: to.lng! };

      const drive = await fetchDrivingRoute(fromCoord, toCoord);

      const distanceMeters = drive?.distanceMeters ?? haversineMeters(fromCoord, toCoord) * 1.3;
      const distanceKm = distanceMeters / 1000;

      result[`${from.id}->${to.id}`] = {
        distanceMeters,
        driveMinutes: drive ? Math.round(drive.durationSeconds / 60) : null,
        walkMinutes: Math.round((distanceKm / WALK_AVG_KMH) * 60),
        busMinutes: Math.round((distanceKm / BUS_AVG_KMH) * 60 + BUS_OVERHEAD_MIN),
        trainMinutes: Math.round((distanceKm / TRAIN_AVG_KMH) * 60 + TRAIN_OVERHEAD_MIN),
      };
    })
  );

  return result;
}

const METERS_PER_MILE = 1609.34;

export function formatDistance(meters: number): string {
  if (meters < METERS_PER_MILE) return `${Math.round((meters * 3.28084) / 10) * 10}ft`;
  return `${(meters / METERS_PER_MILE).toFixed(1)}mi`;
}

export function segmentMinutes(segment: TravelSegment, mode: TravelMode): number | null {
  if (mode === 'walk') return segment.walkMinutes;
  if (mode === 'drive') return segment.driveMinutes;
  if (mode === 'bus') return segment.busMinutes;
  return segment.trainMinutes;
}

// Only driving is a real routed estimate (see fetchDrivingRoute above) — the
// rest are speed-based estimates, worth flagging as such in the UI.
export function isEstimatedMode(mode: TravelMode): boolean {
  return mode !== 'drive';
}
