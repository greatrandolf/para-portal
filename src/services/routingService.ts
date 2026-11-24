import type { LatLng } from '@/utils/geo';

/**
 * Road snapping through OSRM. Defaults to the public demo server, which is
 * rate limited and meant for development only; set EXPO_PUBLIC_OSRM_URL to a
 * self-hosted or commercial OSRM instance for production.
 */
const OSRM_URL = (process.env.EXPO_PUBLIC_OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');

export type RoadRoute = {
  /** Full road geometry, in order. */
  path: LatLng[];
  /** Each requested stop snapped onto the nearest road. */
  snappedStops: LatLng[];
  distanceKm: number;
  durationMin: number;
};

export type SnappedPoint = { point: LatLng; roadName: string };

const toParam = (points: readonly LatLng[]) => points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');

type OsrmWaypoint = { location: [number, number]; name: string };

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM request failed (${res.status})`);
  const body = (await res.json()) as T & { code?: string; message?: string };
  if (body.code && body.code !== 'Ok') throw new Error(body.message ?? `OSRM error: ${body.code}`);
  return body;
}

/** Driving route through every stop, following real roads. */
export async function fetchRoadRoute(stops: readonly LatLng[], signal?: AbortSignal): Promise<RoadRoute> {
  if (stops.length < 2) throw new Error('A route needs at least two stops.');
  const url = `${OSRM_URL}/route/v1/driving/${toParam(stops)}?overview=full&geometries=geojson&continue_straight=false`;
  const body = await getJson<{
    routes: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
    waypoints: OsrmWaypoint[];
  }>(url, signal);
  const route = body.routes[0];
  return {
    path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    snappedStops: body.waypoints.map((wp) => ({ lat: wp.location[1], lng: wp.location[0] })),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

/** Moves a point onto the nearest drivable road and returns the road's name. */
export async function snapToRoad(point: LatLng, signal?: AbortSignal): Promise<SnappedPoint> {
  const body = await getJson<{ waypoints: OsrmWaypoint[] }>(
    `${OSRM_URL}/nearest/v1/driving/${toParam([point])}?number=1`,
    signal,
  );
  const wp = body.waypoints[0];
  return { point: { lat: wp.location[1], lng: wp.location[0] }, roadName: wp.name };
}
